import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/BookingService';
import { DisruptionService } from '../services/DisruptionService';
import { SseService } from '../services/SseService';

const bookingService = new BookingService();
const disruptionService = new DisruptionService();

export class BookingController {
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const travelerId = req.user!.userId;
      const { serviceIds } = req.body;

      const itinerary = await bookingService.createBooking(travelerId, serviceIds);
      res.status(201).json(itinerary);
    } catch (error) {
      next(error);
    }
  }

  static async getMyBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const travelerId = req.user!.userId;
      const itineraries = await bookingService.getMyBookings(travelerId);
      res.status(200).json(itineraries);
    } catch (error) {
      next(error);
    }
  }

  static async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const travelerId = req.user!.userId;
      const { id } = req.params;
      const itinerary = await bookingService.getBookingById(travelerId, id as string);
      res.status(200).json(itinerary);
    } catch (error) {
      next(error);
    }
  }

  static async acceptAlternative(req: Request, res: Response, next: NextFunction) {
    try {
      const travelerId = req.user!.userId;
      const { id } = req.params;
      const { alternativeIndex } = req.body;

      const itinerary = await disruptionService.acceptAlternative(
        travelerId,
        id as string,
        Number(alternativeIndex)
      );
      res.status(200).json(itinerary);
    } catch (error) {
      next(error);
    }
  }

  static streamDisruptions(req: Request, res: Response) {
    const travelerId = req.user!.userId;
    SseService.getInstance().addClient(travelerId, res);
  }
}
