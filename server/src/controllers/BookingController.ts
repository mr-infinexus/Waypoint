import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/BookingService';

const bookingService = new BookingService();

export class BookingController {
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const travelerId = req.user!.userId;
      const { serviceIds } = req.body; // Array of Service UUIDs
      
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
}
