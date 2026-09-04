import { AppDataSource } from '../config/data-source';
import { Service, ServiceType } from '../entities/Service';
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
}

type LabelBag = Map<string, Label[]>;

const BAG_CAP = 5;
const MIN_TRANSFER_BUFFER_MINUTES = 10;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function dominates(a: Label, b: Label): boolean {
  return a.arrivalTime <= b.arrivalTime && a.cost <= b.cost &&
    (a.arrivalTime < b.arrivalTime || a.cost < b.cost);
}

function tryAdd(bag: LabelBag, stationId: string, newLabel: Label): boolean {
  const existing = bag.get(stationId) ?? [];
  if (existing.some((e) => dominates(e, newLabel))) return false;
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

    const endDate = new Date(departureDate.getTime() + 48 * 60 * 60_000);
    const allServices = await this.serviceRepository.find({
      where: {
        departureTime: MoreThanOrEqual(departureDate),
        isCancelled: false,
      },
      relations: { originStation: true, destinationStation: true, operator: true },
    });

    const services = allServices.filter(
      (s) => s.departureTime <= endDate && s.availableSeats > 0,
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
      const newlyMarked = new Set<string>();

      for (const stationId of markedStations) {
        const labelsAtStation = bags[k - 1].get(stationId) ?? [];

        for (const label of labelsAtStation) {
          const isOriginStation = originCandidateMap.has(stationId);
          const notBefore = isOriginStation && label.viaServiceId === ''
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
            };

            if (tryAdd(bags[k], service.destinationStation.id, newLabel)) {
              newlyMarked.add(service.destinationStation.id);
            }
          }
        }
      }

      for (const [stationId, labels] of bags[k]) {
        if (!destCandidateMap.has(stationId)) continue;
        const destWalk = destCandidateMap.get(stationId)!;

        for (const label of labels) {
          if (label.viaServiceId === '') continue;

          const journey = this.reconstructJourney(
            label,
            stationId,
            bags,
            k,
            services,
            originCandidateMap,
            destWalk,
            departureDate,
          );
          if (journey) validJourneys.push(journey);
        }
      }

      markedStations = newlyMarked;
    }

    validJourneys.sort((a, b) => {
      if (sortBy === 'fastest') return a.totalDisplayDurationMs - b.totalDisplayDurationMs;
      if (sortBy === 'cheapest') return a.totalPrice - b.totalPrice;
      if (sortBy === 'transfers') return a.transfers - b.transfers || a.totalDisplayDurationMs - b.totalDisplayDurationMs;
      return 0;
    });

    const deduped = this.deduplicateJourneys(validJourneys);
    await redis.setex(cacheKey, 60, JSON.stringify(deduped));
    return deduped;
  }

  private reconstructJourney(
    destLabel: Label,
    destStationId: string,
    bags: LabelBag[],
    finalRound: number,
    allServices: Service[],
    originCandidateMap: Map<string, StationCandidate>,
    destWalk: StationCandidate,
    departureDate: Date,
  ): SearchResultPath | null {
    const serviceMap = new Map(allServices.map((s) => [s.id, s]));
    const legs: Service[] = [];

    let currentLabel = destLabel;
    let round = finalRound;

    while (currentLabel.viaServiceId !== '') {
      const service = serviceMap.get(currentLabel.viaServiceId);
      if (!service) return null;
      legs.unshift(service);

      round -= 1;
      if (round < 0) break;

      const prevBag = bags[round];
      const prevLabels = prevBag.get(currentLabel.boardedAt) ?? [];

      const prevLabel = prevLabels.find(
        (l) => l.originCandidateStationId === currentLabel.originCandidateStationId,
      );
      if (!prevLabel) break;
      currentLabel = prevLabel;
    }

    if (legs.length === 0) return null;

    const originCandidate = originCandidateMap.get(currentLabel.originCandidateStationId);
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
