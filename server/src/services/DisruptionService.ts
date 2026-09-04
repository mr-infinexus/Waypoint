import { AppDataSource } from '../config/data-source';
import { redis } from '../config/data-source';
import { Service } from '../entities/Service';
import { DisruptionEvent, DisruptionType } from '../entities/DisruptionEvent';
import { Itinerary, ItineraryStatus } from '../entities/Itinerary';
import { Ticket, TicketStatus } from '../entities/Ticket';
import { User } from '../entities/User';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { ItineraryRankingService, SearchResultPath } from './ItineraryRankingService';
import { ItinerarySegment } from '../entities/ItinerarySegment';
import { SseService } from './SseService';
import { EmailService } from './EmailService';
import crypto from 'crypto';

const MAX_ALTERNATIVES = 3;

export class DisruptionService {
  private serviceRepo = AppDataSource.getRepository(Service);
  private disruptionRepo = AppDataSource.getRepository(DisruptionEvent);
  private itineraryRepo = AppDataSource.getRepository(Itinerary);
  private segmentRepo = AppDataSource.getRepository(ItinerarySegment);
  private ticketRepo = AppDataSource.getRepository(Ticket);

  private rankingService = new ItineraryRankingService();

  async reportDelay(operatorId: string, serviceId: string, newArrivalTime: Date, description?: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId },
      relations: { operator: true, originStation: true, destinationStation: true }
    });

    if (!service) throw new NotFoundError('Service not found');
    if (service.operator.id !== operatorId) {
      throw new ForbiddenError('You can only report disruptions for your own services');
    }

    const oldArrival = new Date(service.arrivalTime);
    const delayMinutes = Math.round((newArrivalTime.getTime() - oldArrival.getTime()) / 60000);

    service.isDelayed = true;
    service.arrivalTime = newArrivalTime;
    await this.serviceRepo.save(service);

    const event = this.disruptionRepo.create({
      service,
      type: DisruptionType.DELAY,
      description: description || `Delayed. Expected arrival: ${newArrivalTime.toISOString()}`,
      delayMinutes,
      reportedBy: { id: operatorId } as User
    });
    await this.disruptionRepo.save(event);

    await this.cascadeFlag(service, newArrivalTime, description, delayMinutes);
    return event;
  }

  async reportCancellation(operatorId: string, serviceId: string, description?: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId },
      relations: { operator: true, originStation: true, destinationStation: true }
    });

    if (!service) throw new NotFoundError('Service not found');
    if (service.operator.id !== operatorId) {
      throw new ForbiddenError('You can only report disruptions for your own services');
    }

    service.isCancelled = true;
    await this.serviceRepo.save(service);

    const event = this.disruptionRepo.create({
      service,
      type: DisruptionType.CANCELLATION,
      description: description || `Service ${service.serviceNumber} cancelled.`,
      reportedBy: { id: operatorId } as User
    });
    await this.disruptionRepo.save(event);

    await this.cascadeFlag(service, null, description);
    return event;
  }

  private async cascadeFlag(
    affectedService: Service,
    newArrivalTime: Date | null,
    description?: string,
    delayMinutes?: number
  ) {
    const itineraries = await this.itineraryRepo.find({
      where: { status: ItineraryStatus.ACTIVE },
      relations: {
        traveler: true,
        segments: {
          service: { originStation: true, destinationStation: true }
        }
      }
    });

    for (const itinerary of itineraries) {
      itinerary.segments.sort((a, b) => a.segmentOrder - b.segmentOrder);

      const affectedIdx = itinerary.segments.findIndex(s => s.service.id === affectedService.id);
      if (affectedIdx === -1) continue;

      const isCancelled = newArrivalTime === null;
      const isLastLeg = affectedIdx === itinerary.segments.length - 1;

      if (!isCancelled && isLastLeg) {
        EmailService.getInstance().sendDisruptionAlert({
          toEmail: itinerary.traveler.email,
          travelerName: itinerary.traveler.name,
          type: 'delay',
          serviceNumber: affectedService.serviceNumber,
          originStation: affectedService.originStation.code,
          destinationStation: affectedService.destinationStation.code,
          description,
          delayMinutes,
          newArrivalTime,
          hasAlternatives: false,
          itineraryId: itinerary.id,
        }).catch(() => {});
        continue;
      }

      let connectionBroken = isCancelled;

      if (!isCancelled && !isLastLeg) {
        const nextSeg = itinerary.segments[affectedIdx + 1];
        const bufferDeadline = new Date(newArrivalTime!.getTime() + 30 * 60 * 1000);
        connectionBroken = new Date(nextSeg.service.departureTime) < bufferDeadline;
      }

      if (!connectionBroken) {
        EmailService.getInstance().sendDisruptionAlert({
          toEmail: itinerary.traveler.email,
          travelerName: itinerary.traveler.name,
          type: 'delay',
          serviceNumber: affectedService.serviceNumber,
          originStation: affectedService.originStation.code,
          destinationStation: affectedService.destinationStation.code,
          description,
          delayMinutes,
          newArrivalTime,
          hasAlternatives: false,
          itineraryId: itinerary.id,
        }).catch(() => {});
        continue;
      }

      const breakdownStation = isCancelled
        ? itinerary.segments[affectedIdx].service.originStation
        : itinerary.segments[affectedIdx].service.destinationStation;

      const ultimateStation = itinerary.segments[itinerary.segments.length - 1].service.destinationStation;

      const earliestDeparture = isCancelled
        ? new Date(Math.max(Date.now(), new Date(affectedService.departureTime).getTime()))
        : new Date(newArrivalTime!.getTime() + 30 * 60 * 1000);

      let alternatives: SearchResultPath[] = [];
      try {
        const paths = await this.rankingService.search(
          { lat: Number(breakdownStation.latitude), lng: Number(breakdownStation.longitude) },
          { lat: Number(ultimateStation.latitude), lng: Number(ultimateStation.longitude) },
          earliestDeparture,
          'cheapest',
        );
        alternatives = paths.slice(0, MAX_ALTERNATIVES);
      } catch {
        alternatives = [];
      }

      itinerary.status = ItineraryStatus.DISRUPTED;
      itinerary.pendingAlternatives = alternatives as unknown as object[];
      await this.itineraryRepo.save(itinerary);

      SseService.getInstance().notifyUser(itinerary.traveler.id, 'disruption', {
        type: 'disruption',
        itineraryId: itinerary.id,
        serviceNumber: affectedService.serviceNumber,
        reason: description,
        message: isCancelled
          ? `Service ${affectedService.serviceNumber} was cancelled. Alternative routes are available.`
          : `Service ${affectedService.serviceNumber} is delayed. Connection broken. Alternative routes available.`,
        pendingAlternativesCount: alternatives.length,
      });

      EmailService.getInstance().sendDisruptionAlert({
        toEmail: itinerary.traveler.email,
        travelerName: itinerary.traveler.name,
        type: isCancelled ? 'cancellation' : 'delay',
        serviceNumber: affectedService.serviceNumber,
        originStation: affectedService.originStation.code,
        destinationStation: affectedService.destinationStation.code,
        description,
        delayMinutes,
        newArrivalTime,
        hasAlternatives: alternatives.length > 0,
        alternativeCount: alternatives.length,
        itineraryId: itinerary.id,
      }).catch(() => {});
    }
  }

  async acceptAlternative(travelerId: string, itineraryId: string, alternativeIndex: number): Promise<Itinerary> {
    const itinerary = await this.itineraryRepo.findOne({
      where: { id: itineraryId, traveler: { id: travelerId } },
      relations: {
        traveler: true,
        segments: {
          service: { originStation: true, destinationStation: true },
          tickets: true
        }
      }
    });

    if (!itinerary) throw new NotFoundError('Itinerary not found');
    if (itinerary.status !== ItineraryStatus.DISRUPTED) {
      throw new BadRequestError('Itinerary is not in a disrupted state');
    }

    const alternatives = (itinerary.pendingAlternatives || []) as unknown as SearchResultPath[];
    if (alternativeIndex < 0 || alternativeIndex >= alternatives.length) {
      throw new BadRequestError('Invalid alternative index');
    }

    const chosen = alternatives[alternativeIndex];

    itinerary.segments.sort((a, b) => a.segmentOrder - b.segmentOrder);

    let cutFrom = 0;
    const cancelledIdx = itinerary.segments.findIndex(s => s.service.isCancelled);
    if (cancelledIdx !== -1) {
      cutFrom = cancelledIdx;
    } else {
      const delayedIdx = itinerary.segments.findIndex(s => s.service.isDelayed);
      cutFrom = delayedIdx !== -1 ? delayedIdx + 1 : 0;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const obsoleteSegments = itinerary.segments.slice(cutFrom);
      for (const seg of obsoleteSegments) {
        for (const ticket of (seg.tickets || [])) {
          ticket.status = TicketStatus.CANCELLED;
          await queryRunner.manager.save(ticket);
        }
      }
      if (obsoleteSegments.length > 0) {
        await queryRunner.manager.remove(obsoleteSegments);
      }

      let nextOrder = cutFrom;
      let additionalCost = 0;

      for (const newService of chosen.services) {
        const lockedService = await queryRunner.manager.findOne(Service, {
          where: { id: newService.id },
          lock: { mode: 'pessimistic_write' }
        });
        if (!lockedService) throw new NotFoundError(`Service ${newService.id} not found`);
        additionalCost += Number(lockedService.price);

        const seg = queryRunner.manager.create(ItinerarySegment, {
          itinerary: { id: itinerary.id } as Itinerary,
          service: lockedService,
          segmentOrder: nextOrder++
        });
        const savedSeg = await queryRunner.manager.save(seg);

        const ticket = queryRunner.manager.create(Ticket, {
          traveler: { id: travelerId } as User,
          itinerarySegment: savedSeg,
          status: TicketStatus.VALID,
          qrCode: `waypoint-qr-${crypto.randomUUID()}`
        });
        await queryRunner.manager.save(ticket);
      }

      const keptCost = itinerary.segments
        .slice(0, cutFrom)
        .reduce((sum, s) => sum + Number(s.service.price), 0);

      const newTotalCost = keptCost + additionalCost;

      await queryRunner.manager.update(Itinerary, itinerary.id, {
        totalCost: newTotalCost,
        status: ItineraryStatus.ACTIVE,
        pendingAlternatives: null as any,
        destinationWalk: chosen.destinationWalk || null,
        originWalk: cutFrom === 0 ? (chosen.originWalk || null) : (itinerary.originWalk || null),
      });

      await queryRunner.commitTransaction();

      await this.invalidateSearchCacheForServices(chosen.services);

      SseService.getInstance().notifyUser(travelerId, 'resolved', {
        type: 'resolved',
        itineraryId: itinerary.id,
        message: 'Your route alternative was confirmed and your itinerary has been updated.',
      });

      return await this.itineraryRepo.findOne({
        where: { id: itinerary.id },
        relations: {
          segments: {
            service: { originStation: true, destinationStation: true, operator: true },
            tickets: true
          }
        },
        order: {
          segments: {
            segmentOrder: 'ASC'
          }
        }
      }) as Itinerary;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async invalidateSearchCacheForServices(services: Pick<Service, 'id'>[]) {
    for (const service of services) {
      const full = await this.serviceRepo.findOne({
        where: { id: service.id },
        relations: { originStation: true, destinationStation: true }
      });
      if (!full || !full.originStation?.latitude || !full.destinationStation?.latitude) continue;

      const pattern = `search:${full.originStation.latitude},${full.originStation.longitude}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    }
  }
}
