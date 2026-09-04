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

      // 1. Verify availability and decrement seats (pessimistic lock would be ideal, but for now just update)
      for (const id of serviceIds) {
        // Find with pessimistic write lock to prevent race conditions during seat booking
        const service = await queryRunner.manager.findOne(Service, { 
          where: { id },
          lock: { mode: 'pessimistic_write' }
        });

        if (!service) {
          throw new NotFoundError(`Service ${id} not found`);
        }
        if (service.availableSeats <= 0) {
          throw new BadRequestError(`Service ${service.serviceNumber} is fully booked`);
        }
        if (service.isCancelled) {
          throw new BadRequestError(`Service ${service.serviceNumber} is cancelled`);
        }

        service.availableSeats -= 1;
        totalCost += Number(service.price);
        services.push(service);

        await queryRunner.manager.save(service);
      }

      // 2. Create the Itinerary
      let itinerary = queryRunner.manager.create(Itinerary, {
        traveler,
        totalCost,
        status: ItineraryStatus.ACTIVE,
      });
      itinerary = await queryRunner.manager.save(itinerary);

      // 3. Create Segments & Tickets
      const segments: ItinerarySegment[] = [];
      const tickets: Ticket[] = [];

      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        
        let segment = queryRunner.manager.create(ItinerarySegment, {
          itinerary,
          service,
          segmentOrder: i
        });
        segment = await queryRunner.manager.save(segment);
        segments.push(segment);

        // Generate a mock QR seed
        const qrSeed = crypto.randomUUID();

        let ticket = queryRunner.manager.create(Ticket, {
          traveler,
          itinerarySegment: segment,
          status: TicketStatus.VALID,
          qrCode: `waypoint-qr-${qrSeed}`
        });
        ticket = await queryRunner.manager.save(ticket);
        tickets.push(ticket);
      }

      await queryRunner.commitTransaction();

      // Return the complete Itinerary with segments
      return await AppDataSource.getRepository(Itinerary).findOne({
        where: { id: itinerary.id },
        relations: {
          segments: {
            service: { originStation: true, destinationStation: true, operator: true },
            tickets: true
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

  async getMyBookings(travelerId: string) {
    return await AppDataSource.getRepository(Itinerary).find({
      where: { traveler: { id: travelerId } },
      relations: {
        segments: {
          service: { originStation: true, destinationStation: true, operator: true },
          tickets: true
        }
      },
      order: { createdAt: 'DESC' }
    });
  }
}
