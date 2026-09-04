import { AppDataSource } from '../config/data-source';
import { Service } from '../entities/Service';
import { Itinerary, ItineraryStatus } from '../entities/Itinerary';
import { ItinerarySegment } from '../entities/ItinerarySegment';
import { Ticket, TicketStatus } from '../entities/Ticket';
import { User } from '../entities/User';
import { BadRequestError, NotFoundError } from '../utils/errors';
import crypto from 'crypto';

export class BookingService {
  async createBooking(travelerId: string, serviceIds: string[]): Promise<Itinerary> {
    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestError('No services provided for booking');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const traveler = await userRepo.findOneBy({ id: travelerId });
      if (!traveler) {
        throw new NotFoundError('Traveler not found');
      }

      let totalCost = 0;
      const services: Service[] = [];

      for (const id of serviceIds) {
        const service = await queryRunner.manager.findOne(Service, {
          where: { id },
          lock: { mode: 'pessimistic_write' }
        });

        if (!service) {
          throw new NotFoundError(`Service ${id} not found`);
        }
        if (service.isCancelled) {
          throw new BadRequestError(`Service ${service.serviceNumber} is cancelled`);
        }

        totalCost += Number(service.price);
        services.push(service);
      }

      let itinerary = queryRunner.manager.create(Itinerary, {
        traveler,
        totalCost,
        status: ItineraryStatus.ACTIVE,
      });
      itinerary = await queryRunner.manager.save(itinerary);

      for (let i = 0; i < services.length; i++) {
        const service = services[i];

        let segment = queryRunner.manager.create(ItinerarySegment, {
          itinerary,
          service,
          segmentOrder: i
        });
        segment = await queryRunner.manager.save(segment);

        const qrSeed = crypto.randomUUID();

        const ticket = queryRunner.manager.create(Ticket, {
          traveler,
          itinerarySegment: segment,
          status: TicketStatus.VALID,
          qrCode: `waypoint-qr-${qrSeed}`
        });
        await queryRunner.manager.save(ticket);
      }

      await queryRunner.commitTransaction();

      return await AppDataSource.getRepository(Itinerary).findOne({
        where: { id: itinerary.id },
        relations: {
          segments: {
            service: { originStation: true, destinationStation: true, operator: true },
            tickets: true
          }
        },
        order: {
          segments: { segmentOrder: 'ASC' }
        }
      }) as Itinerary;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyBookings(travelerId: string) {
    return await AppDataSource.getRepository(Itinerary).find({
      where: { traveler: { id: travelerId } },
      relations: {
        segments: {
          service: { originStation: true, destinationStation: true, operator: true },
          tickets: true
        }
      },
      order: {
        createdAt: 'DESC',
        segments: { segmentOrder: 'ASC' }
      }
    });
  }

  async getBookingById(travelerId: string, itineraryId: string): Promise<Itinerary> {
    const itinerary = await AppDataSource.getRepository(Itinerary).findOne({
      where: { id: itineraryId, traveler: { id: travelerId } },
      relations: {
        segments: {
          service: { originStation: true, destinationStation: true, operator: true },
          tickets: true
        }
      },
      order: {
        segments: { segmentOrder: 'ASC' }
      }
    });

    if (!itinerary) throw new NotFoundError('Itinerary not found');

    await this.markCompletedIfDue(itinerary);

    return itinerary;
  }

  private async markCompletedIfDue(itinerary: Itinerary) {
    if (itinerary.status !== ItineraryStatus.ACTIVE) return;

    const sorted = [...itinerary.segments].sort((a, b) => a.segmentOrder - b.segmentOrder);
    const lastSeg = sorted[sorted.length - 1];
    if (!lastSeg) return;

    const arrivalTime = new Date(lastSeg.service.arrivalTime);
    if (arrivalTime <= new Date()) {
      itinerary.status = ItineraryStatus.COMPLETED;
      await AppDataSource.getRepository(Itinerary).update(itinerary.id, {
        status: ItineraryStatus.COMPLETED
      });
    }
  }
}
