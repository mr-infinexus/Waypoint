import { AppDataSource } from '../config/data-source';
import { Service } from '../entities/Service';
import { Station } from '../entities/Station';
import { MoreThanOrEqual } from 'typeorm';
import { redis } from '../config/data-source';
import {
  GeoPoint,
  StationCandidate,
  findNearbyStations,
  haversineKm,
  walkMinutes,
  MAX_WALK_RADIUS_KM,
} from '../utils/geo';
import { BadRequestError } from '../utils/errors';

export interface SearchResultPath {
  services: Service[];
  totalPrice: number;
  totalDurationMs: number;
  totalDisplayDurationMs: number;
  transfers: number;
  originWalk: { distanceKm: number; durationMinutes: number; toStationId: string } | null;
  destinationWalk: { fromStationId: string; distanceKm: number; durationMinutes: number } | null;
}

export type SortHeuristic = 'fastest' | 'cheapest' | 'transfers';

interface Label {
  arrivalTime: Date;
  cost: number;
  transfers: number;
  viaServiceId: string;
  boardedAt: string;
  originCandidateStationId: string;
  parentLabel?: Label;
}

type LabelBag = Map<string, Label[]>;

interface Footpath {
  toStationId: string;
  distanceKm: number;
  walkMinutes: number;
}

const BAG_CAP = 10;
const MIN_TRANSFER_BUFFER_MINUTES = 10;
const MAX_STATION_FOOTPATH_KM = 0.8;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function dominates(a: Label, b: Label): boolean {
  return a.arrivalTime <= b.arrivalTime && a.cost <= b.cost &&
    (a.arrivalTime < b.arrivalTime || a.cost < b.cost);
}

function tryAdd(bag: LabelBag, stationId: string, newLabel: Label): boolean {
  const existing = bag.get(stationId) ?? [];
  if (existing.some((e) => dominates(e, newLabel) || (e.arrivalTime.getTime() === newLabel.arrivalTime.getTime() && e.cost <= newLabel.cost))) {
    return false;
  }
  const pruned = existing.filter((e) => !dominates(newLabel, e));
  if (pruned.length >= BAG_CAP) return false;
  pruned.push(newLabel);
  bag.set(stationId, pruned);
  return true;
}

function cloneBag(source: LabelBag): LabelBag {
  const copy: LabelBag = new Map();
  for (const [k, v] of source) {
    copy.set(k, [...v.map((l) => ({ ...l }))]);
  }
  return copy;
}

export class ItineraryRankingService {
  private serviceRepository = AppDataSource.getRepository(Service);
  private stationRepository = AppDataSource.getRepository(Station);

  async search(
    originPoint: GeoPoint,
    destinationPoint: GeoPoint,
    departureDate: Date,
    sortBy: SortHeuristic = 'cheapest',
    maxRounds = 4,
  ): Promise<SearchResultPath[]> {
    const cacheKey = `search:${originPoint.lat},${originPoint.lng}:${destinationPoint.lat},${destinationPoint.lng}:${departureDate.toISOString()}:${sortBy}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const allStations = await this.stationRepository.find();

    const originCandidates = findNearbyStations(originPoint, allStations);
    if (originCandidates.length === 0) {
      throw new BadRequestError('No stations found within 2km of your origin location');
    }

    const destCandidates = findNearbyStations(destinationPoint, allStations);
    if (destCandidates.length === 0) {
      throw new BadRequestError('No stations found within 2km of your destination location');
    }

    const destCandidateMap = new Map<string, StationCandidate>(
      destCandidates.map((c) => [c.station.id, c]),
    );

    const originCandidateMap = new Map<string, StationCandidate>(
      originCandidates.map((c) => [c.station.id, c]),
    );

    const footpaths = new Map<string, Footpath[]>();
    for (const s1 of allStations) {
      const neighbors: Footpath[] = [];
      for (const s2 of allStations) {
        if (s1.id === s2.id) continue;
        const d = haversineKm(
          { lat: Number(s1.latitude), lng: Number(s1.longitude) },
          { lat: Number(s2.latitude), lng: Number(s2.longitude) },
        );
        if (d <= MAX_STATION_FOOTPATH_KM) {
          neighbors.push({
            toStationId: s2.id,
            distanceKm: d,
            walkMinutes: walkMinutes(d),
          });
        }
      }
      if (neighbors.length > 0) footpaths.set(s1.id, neighbors);
    }

    const endDate = new Date(departureDate.getTime() + 48 * 60 * 60_000);
    const allServices = await this.serviceRepository.find({
      where: {
        departureTime: MoreThanOrEqual(departureDate),
        isCancelled: false,
      },
      relations: { originStation: true, destinationStation: true, operator: true },
    });

    const services = allServices.filter(
      (s) => s.departureTime <= endDate,
    );

    const adjList = new Map<string, Service[]>();
    for (const s of services) {
      if (!adjList.has(s.originStation.id)) adjList.set(s.originStation.id, []);
      adjList.get(s.originStation.id)!.push(s);
    }

    const validJourneys: SearchResultPath[] = [];

    const directWalkKm = haversineKm(originPoint, destinationPoint);
    if (directWalkKm <= MAX_WALK_RADIUS_KM) {
      const wm = walkMinutes(directWalkKm);
      validJourneys.push({
        services: [],
        totalPrice: 0,
        totalDurationMs: 0,
        totalDisplayDurationMs: wm * 60_000,
        transfers: 0,
        originWalk: null,
        destinationWalk: null,
      });
    }

    const bags: LabelBag[] = [new Map()];
    let markedStations = new Set<string>();

    for (const candidate of originCandidates) {
      const seedLabel: Label = {
        arrivalTime: addMinutes(departureDate, candidate.walkMinutes),
        cost: 0,
        transfers: 0,
        viaServiceId: '',
        boardedAt: candidate.station.id,
        originCandidateStationId: candidate.station.id,
      };
      bags[0].set(candidate.station.id, [seedLabel]);
      markedStations.add(candidate.station.id);
    }

    for (let k = 1; k <= maxRounds && markedStations.size > 0; k++) {
      bags[k] = cloneBag(bags[k - 1]);
      const transitMarked = new Set<string>();

      for (const stationId of markedStations) {
        const labelsAtStation = bags[k - 1].get(stationId) ?? [];

        for (const label of labelsAtStation) {
          const isOriginStation = originCandidateMap.has(stationId);
          const notBefore = isOriginStation && label.viaServiceId === '' && !label.parentLabel
            ? label.arrivalTime
            : addMinutes(label.arrivalTime, MIN_TRANSFER_BUFFER_MINUTES);

          const candidates = adjList.get(stationId) ?? [];

          for (const service of candidates) {
            if (service.departureTime < notBefore) continue;

            const newLabel: Label = {
              arrivalTime: service.arrivalTime,
              cost: label.cost + Number(service.price),
              transfers: k,
              viaServiceId: service.id,
              boardedAt: stationId,
              originCandidateStationId: label.originCandidateStationId,
              parentLabel: label,
            };

            if (tryAdd(bags[k], service.destinationStation.id, newLabel)) {
              transitMarked.add(service.destinationStation.id);
            }
          }
        }
      }

      const newlyMarked = new Set<string>(transitMarked);

      for (const stationId of transitMarked) {
        const fps = footpaths.get(stationId) ?? [];
        const labelsAtStation = (bags[k].get(stationId) ?? []).filter(
          (l) => l.viaServiceId !== '' && l.transfers === k,
        );

        for (const fp of fps) {
          for (const label of labelsAtStation) {
            const fpLabel: Label = {
              arrivalTime: addMinutes(label.arrivalTime, fp.walkMinutes),
              cost: label.cost,
              transfers: label.transfers,
              viaServiceId: '',
              boardedAt: stationId,
              originCandidateStationId: label.originCandidateStationId,
              parentLabel: label,
            };

            if (tryAdd(bags[k], fp.toStationId, fpLabel)) {
              newlyMarked.add(fp.toStationId);
            }
          }
        }
      }

      for (const [stationId, labels] of bags[k]) {
        if (!destCandidateMap.has(stationId)) continue;
        const destWalk = destCandidateMap.get(stationId)!;

        for (const label of labels) {
          if (label.transfers !== k) continue;

          const journey = this.reconstructJourney(
            label,
            services,
            originCandidateMap,
            destWalk,
          );
          if (journey) validJourneys.push(journey);
        }
      }

      markedStations = newlyMarked;
    }

    validJourneys.sort((a, b) => {
      if (sortBy === 'fastest') {
        return a.totalDisplayDurationMs - b.totalDisplayDurationMs || a.totalPrice - b.totalPrice;
      }
      if (sortBy === 'cheapest') {
        return a.totalPrice - b.totalPrice || a.totalDisplayDurationMs - b.totalDisplayDurationMs;
      }
      if (sortBy === 'transfers') {
        return a.transfers - b.transfers || a.totalDisplayDurationMs - b.totalDisplayDurationMs || a.totalPrice - b.totalPrice;
      }
      return 0;
    });

    const deduped = this.deduplicateJourneys(validJourneys);
    await redis.setex(cacheKey, 60, JSON.stringify(deduped));
    return deduped;
  }

  private reconstructJourney(
    destLabel: Label,
    allServices: Service[],
    originCandidateMap: Map<string, StationCandidate>,
    destWalk: StationCandidate,
  ): SearchResultPath | null {
    const serviceMap = new Map(allServices.map((s) => [s.id, s]));
    const legs: Service[] = [];

    let currentLabel: Label | undefined = destLabel;

    while (currentLabel && (currentLabel.viaServiceId !== '' || currentLabel.parentLabel)) {
      if (currentLabel.viaServiceId !== '') {
        const service = serviceMap.get(currentLabel.viaServiceId);
        if (!service) return null;
        legs.unshift(service);
      }
      currentLabel = currentLabel.parentLabel;
    }

    if (legs.length === 0) return null;

    for (let i = 0; i < legs.length - 1; i++) {
      const prev = legs[i];
      const next = legs[i + 1];
      if (next.departureTime.getTime() < prev.arrivalTime.getTime() + MIN_TRANSFER_BUFFER_MINUTES * 60_000) {
        return null;
      }
    }

    const firstOriginCandidateId = destLabel.originCandidateStationId;
    const originCandidate = originCandidateMap.get(firstOriginCandidateId);
    if (!originCandidate) return null;

    const originWalk = {
      distanceKm: originCandidate.distanceKm,
      durationMinutes: originCandidate.walkMinutes,
      toStationId: originCandidate.station.id,
    };

    const destinationWalk = {
      fromStationId: destWalk.station.id,
      distanceKm: destWalk.distanceKm,
      durationMinutes: destWalk.walkMinutes,
    };

    const firstService = legs[0];
    const lastService = legs[legs.length - 1];
    const transitDurationMs = lastService.arrivalTime.getTime() - firstService.departureTime.getTime();
    const totalDisplayDurationMs =
      originWalk.durationMinutes * 60_000 +
      transitDurationMs +
      destinationWalk.durationMinutes * 60_000;

    let totalPrice = 0;
    for (const s of legs) {
      totalPrice += Number(s.price);
    }

    return {
      services: legs,
      totalPrice,
      totalDurationMs: transitDurationMs,
      totalDisplayDurationMs,
      transfers: legs.length - 1,
      originWalk,
      destinationWalk,
    };
  }

  private deduplicateJourneys(journeys: SearchResultPath[]): SearchResultPath[] {
    const seen = new Set<string>();
    return journeys.filter((j) => {
      const key = j.services.map((s) => s.id).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
