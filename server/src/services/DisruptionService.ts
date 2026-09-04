import { AppDataSource } from '../config/data-source';
import { Service } from '../entities/Service';
import { DisruptionEvent, DisruptionType } from '../entities/DisruptionEvent';
import { Itinerary, ItineraryStatus } from '../entities/Itinerary';
import { User } from '../entities/User';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ItineraryRankingService } from './ItineraryRankingService';
import { BookingService } from './BookingService';
import { ItinerarySegment } from '../entities/ItinerarySegment';

export class DisruptionService {
  private serviceRepo = AppDataSource.getRepository(Service);
  private disruptionRepo = AppDataSource.getRepository(DisruptionEvent);
  private itineraryRepo = AppDataSource.getRepository(Itinerary);
  private segmentRepo = AppDataSource.getRepository(ItinerarySegment);
  
  private rankingService = new ItineraryRankingService();
  private bookingService = new BookingService(); // Used to create new tickets/segments if needed

  async reportDelay(operatorId: string, serviceId: string, newArrivalTime: Date, description?: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId },
      relations: { operator: true, destinationStation: true }
    });

    if (!service) throw new NotFoundError('Service not found');
    if (service.operator.id !== operatorId) {
      throw new ForbiddenError('You can only report disruptions for your own services');
    }

    service.isDelayed = true;
    service.arrivalTime = newArrivalTime;
    await this.serviceRepo.save(service);

    const event = this.disruptionRepo.create({
      service,
      type: DisruptionType.DELAY,
      description: description || `Delayed. Expected arrival: ${newArrivalTime}`,
      reportedBy: { id: operatorId } as User
    });
    await this.disruptionRepo.save(event);

    await this.cascadeReplan(service.id, newArrivalTime);
    return event;
  }

  private async cascadeReplan(delayedServiceId: string, newArrivalTime: Date) {
    // Find all ACTIVE itineraries that contain this service
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
      // Sort segments by order
      itinerary.segments.sort((a, b) => a.segmentOrder - b.segmentOrder);
      
      const delayedSegmentIndex = itinerary.segments.findIndex(s => s.service.id === delayedServiceId);
      if (delayedSegmentIndex === -1) continue; // Not in this itinerary

      // If it's the last leg, it just arrives late, no layover to break
      if (delayedSegmentIndex === itinerary.segments.length - 1) continue;

      const nextSegment = itinerary.segments[delayedSegmentIndex + 1];
      const requiredNextDeparture = new Date(newArrivalTime.getTime() + 30 * 60 * 1000); // 30 mins buffer

      if (nextSegment.service.departureTime < requiredNextDeparture) {
        itinerary.status = ItineraryStatus.DISRUPTED;
        await this.itineraryRepo.save(itinerary);

        const disruptedStation = itinerary.segments[delayedSegmentIndex].service.destinationStation;
        const ultimateStation = itinerary.segments[itinerary.segments.length - 1].service.destinationStation;

        const paths = await this.rankingService.search(
          { lat: Number(disruptedStation.latitude), lng: Number(disruptedStation.longitude) },
          { lat: Number(ultimateStation.latitude), lng: Number(ultimateStation.longitude) },
          requiredNextDeparture,
          'cheapest',
        );

        if (paths.length > 0) {
          const bestPath = paths[0];
          const obsoleteSegments = itinerary.segments.slice(delayedSegmentIndex + 1);
          await this.segmentRepo.remove(obsoleteSegments);
          itinerary.segments = itinerary.segments.slice(0, delayedSegmentIndex + 1);

          let nextOrder = delayedSegmentIndex + 1;
          for (const newService of bestPath.services) {
            const newSeg = this.segmentRepo.create({
              itinerary: itinerary,
              service: newService,
              segmentOrder: nextOrder++
            });
            await this.segmentRepo.save(newSeg);
            itinerary.segments.push(newSeg);
            
            // We should also decrement availableSeats for the newly chosen services
            newService.availableSeats -= 1;
            await this.serviceRepo.save(newService);
          }

          // Mark as active again since we successfully re-routed
          itinerary.status = ItineraryStatus.ACTIVE;
          await this.itineraryRepo.save(itinerary);
          console.log(`Successfully re-routed Itinerary ${itinerary.id}`);
        } else {
          console.log(`Failed to find alternative route for Itinerary ${itinerary.id}. Requires manual intervention.`);
        }
      }
    }
  }
}
