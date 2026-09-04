import { Request, Response, NextFunction } from 'express';
import { ItineraryRankingService, SortHeuristic } from '../services/ItineraryRankingService';
import { BadRequestError } from '../utils/errors';

const rankingService = new ItineraryRankingService();

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { originLat, originLng, destinationLat, destinationLng, date, sortBy } = req.query;

      if (!originLat || !originLng || !destinationLat || !destinationLng || !date) {
        throw new BadRequestError('Missing required query parameters: originLat, originLng, destinationLat, destinationLng, date');
      }

      const oLat = parseFloat(originLat as string);
      const oLng = parseFloat(originLng as string);
      const dLat = parseFloat(destinationLat as string);
      const dLng = parseFloat(destinationLng as string);

      if (!isFinite(oLat) || !isFinite(oLng) || !isFinite(dLat) || !isFinite(dLng)) {
        throw new BadRequestError('Invalid coordinate values');
      }

      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid date format');
      }

      const paths = await rankingService.search(
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng },
        parsedDate,
        (sortBy as SortHeuristic) || 'cheapest',
      );

      res.status(200).json(paths);
    } catch (error) {
      next(error);
    }
  }
}
