import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { User, UserRole } from '../entities/User';
import { Station } from '../entities/Station';
import { Service, ServiceType } from '../entities/Service';
import { Itinerary, ItineraryStatus } from '../entities/Itinerary';
import { ItinerarySegment } from '../entities/ItinerarySegment';
import { Ticket, TicketStatus } from '../entities/Ticket';
import { DisruptionEvent, DisruptionType } from '../entities/DisruptionEvent';
import { ItineraryRankingService } from '../services/ItineraryRankingService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import usersData from '../data/users.json';
import stationsData from '../data/stations.json';
import servicesData from '../data/services.json';
import disruptionsData from '../data/disruptions.json';
import itinerariesData from '../data/itineraries.json';

interface ServiceSeedInput {
  operatorEmail: string;
  type: string;
  serviceNumber: string;
  originCode: string;
  destCode: string;
  depHour?: number;
  depMinute?: number;
  arrHour?: number;
  arrMinute?: number;
  durationMinutes?: number;
  price: number;
  dayOffsets?: number[];
}

export async function runComprehensiveSeed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.runMigrations();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.query(
    'TRUNCATE TABLE tickets, itinerary_segments, itineraries, disruption_events, services, stations, users CASCADE;',
  );

  const userRepo = AppDataSource.getRepository(User);
  const stationRepo = AppDataSource.getRepository(Station);
  const serviceRepo = AppDataSource.getRepository(Service);
  const itineraryRepo = AppDataSource.getRepository(Itinerary);
  const segmentRepo = AppDataSource.getRepository(ItinerarySegment);
  const ticketRepo = AppDataSource.getRepository(Ticket);
  const disruptionRepo = AppDataSource.getRepository(DisruptionEvent);

  const defaultHash = await bcrypt.hash('Password123!', 10);

  console.log(`Seeding ${usersData.length} users`);
  const userEntities = usersData.map((u) =>
    userRepo.create({
      name: u.name,
      email: u.email,
      passwordHash: defaultHash,
      role: u.role as UserRole,
      isActive: u.isActive ?? true,
    }),
  );
  const savedUsers = await userRepo.save(userEntities);
  const userMap = new Map<string, User>(savedUsers.map((u) => [u.email, u]));

  console.log(`Seeding ${stationsData.length} stations`);
  const stationEntities = stationsData.map((s) =>
    stationRepo.create({
      code: s.code,
      name: s.name,
      city: s.city,
      latitude: s.latitude,
      longitude: s.longitude,
    }),
  );
  const savedStations = await stationRepo.save(stationEntities);
  const stationMap = new Map<string, Station>(savedStations.map((s) => [s.code, s]));

  console.log(`Seeding services from ${servicesData.length} route templates`);
  const now = new Date();

  function buildDate(dayOffset: number, hour: number, minute: number): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const generatedServices: Service[] = [];
  const activeDayOffsets = [0, 1, 2];

  for (const rawItem of servicesData as ServiceSeedInput[]) {
    const operator = userMap.get(rawItem.operatorEmail) || userMap.get('ops@metrotransit.in')!;
    const originStation = stationMap.get(rawItem.originCode);
    const destinationStation = stationMap.get(rawItem.destCode);

    if (!originStation || !destinationStation) {
      console.warn(
        `Skipping service ${rawItem.serviceNumber}: Station not found (${rawItem.originCode} -> ${rawItem.destCode})`,
      );
      continue;
    }

    const dayOffsetsToGenerate = rawItem.dayOffsets ?? activeDayOffsets;

    for (const dayOffset of dayOffsetsToGenerate) {
      const depHour = rawItem.depHour ?? 6;
      const depMinute = rawItem.depMinute ?? 0;
      const departureTime = buildDate(dayOffset, depHour, depMinute);

      let arrivalTime: Date;
      if (rawItem.durationMinutes !== undefined) {
        arrivalTime = new Date(departureTime.getTime() + rawItem.durationMinutes * 60_000);
      } else if (rawItem.arrHour !== undefined) {
        const isNextDay = rawItem.arrHour >= 24;
        const normalizedArrHour = rawItem.arrHour % 24;
        const arrDayOffset = dayOffset + (isNextDay ? Math.floor(rawItem.arrHour / 24) : 0);
        arrivalTime = buildDate(arrDayOffset, normalizedArrHour, rawItem.arrMinute ?? 0);
      } else {
        arrivalTime = new Date(departureTime.getTime() + 60 * 60_000);
      }

      const serviceNumber =
        dayOffset === 1
          ? rawItem.serviceNumber
          : `${rawItem.serviceNumber}-D${dayOffset}`;

      generatedServices.push(
        serviceRepo.create({
          serviceNumber,
          operator,
          type: rawItem.type as ServiceType,
          originStation,
          destinationStation,
          departureTime,
          arrivalTime,
          price: rawItem.price,
          isDelayed: false,
          isCancelled: false,
        }),
      );
    }
  }

  const savedServices = await serviceRepo.save(generatedServices);
  const srvMap = new Map<string, Service>(savedServices.map((s) => [s.serviceNumber, s]));
  console.log(`Successfully saved ${savedServices.length} active service instances.`);

  console.log(`Seeding ${disruptionsData.length} disruption events`);
  for (const d of disruptionsData) {
    const service = srvMap.get(d.serviceNumber);
    if (!service) {
      console.warn(`Disruption service not found: ${d.serviceNumber}`);
      continue;
    }

    if (d.type === 'delay') {
      service.isDelayed = true;
      const delayMs = (d.delayMinutes ?? 60) * 60_000;
      service.arrivalTime = new Date(service.arrivalTime.getTime() + delayMs);
      await serviceRepo.save(service);
    } else if (d.type === 'cancellation') {
      service.isCancelled = true;
      await serviceRepo.save(service);
    }

    const reporter = userMap.get(d.reportedByEmail) || service.operator;
    const disruption = disruptionRepo.create({
      service,
      type: d.type as DisruptionType,
      description: d.description,
      delayMinutes: d.delayMinutes ?? null,
      reportedBy: reporter,
    });
    await disruptionRepo.save(disruption);
  }

  const rankingService = new ItineraryRankingService();

  console.log(`Seeding ${itinerariesData.length} itineraries with segments and tickets`);
  for (const itData of itinerariesData) {
    const traveler = userMap.get(itData.travelerEmail);
    if (!traveler) {
      console.warn(`Traveler not found for itinerary: ${itData.travelerEmail}`);
      continue;
    }

    const matchedServices: Service[] = [];
    for (const sNum of itData.serviceNumbers) {
      const s = srvMap.get(sNum);
      if (s) {
        matchedServices.push(s);
      } else {
        console.warn(`Service ${sNum} not found for itinerary of ${itData.travelerEmail}`);
      }
    }

    if (matchedServices.length === 0) continue;

    const totalCost = matchedServices.reduce((acc, s) => acc + Number(s.price), 0);
    const itinerary = itineraryRepo.create({
      traveler,
      totalCost,
      status: itData.status as ItineraryStatus,
    });
    await itineraryRepo.save(itinerary);

    const segments: ItinerarySegment[] = [];
    for (let idx = 0; idx < matchedServices.length; idx++) {
      const seg = segmentRepo.create({
        itinerary,
        service: matchedServices[idx],
        segmentOrder: idx,
      });
      segments.push(seg);
    }
    const savedSegments = await segmentRepo.save(segments);

    const tickets = savedSegments.map((seg) =>
      ticketRepo.create({
        traveler,
        itinerarySegment: seg,
        status: (itData.ticketStatus as TicketStatus) || TicketStatus.VALID,
        qrCode: `wp-ticket-${crypto.randomUUID()}`,
      }),
    );
    await ticketRepo.save(tickets);

    if (itData.status === 'disrupted' && matchedServices.length > 1) {
      try {
        const breakdownStation = matchedServices[0].destinationStation;
        const ultimateStation = matchedServices[matchedServices.length - 1].destinationStation;
        const earliestDeparture = new Date(matchedServices[0].arrivalTime.getTime() + 30 * 60_000);

        const alternatives = await rankingService.search(
          { lat: Number(breakdownStation.latitude), lng: Number(breakdownStation.longitude) },
          { lat: Number(ultimateStation.latitude), lng: Number(ultimateStation.longitude) },
          earliestDeparture,
          'cheapest',
        );

        itinerary.pendingAlternatives = alternatives.slice(0, 3);
        await itineraryRepo.save(itinerary);
      } catch (e) {
        console.warn('Failed to compute seed alternatives:', e);
      }
    }
  }

  console.log('Seeding complete.');

  await queryRunner.release();
}

if (require.main === module) {
  runComprehensiveSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}