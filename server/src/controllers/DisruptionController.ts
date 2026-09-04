import { Request, Response, NextFunction } from 'express';
import { DisruptionService } from '../services/DisruptionService';

const disruptionService = new DisruptionService();

export class DisruptionController {
  static async reportDelay(req: Request, res: Response, next: NextFunction) {
    try {
      const operatorId = req.user!.userId;
      const { serviceId } = req.params;
      const { newArrivalTime, description } = req.body;

      const event = await disruptionService.reportDelay(
        operatorId,
        serviceId as string,
        new Date(newArrivalTime),
        description
      );

      res.status(201).json({ message: 'Disruption reported and cascade replan triggered', event });
    } catch (error) {
      next(error);
    }
  }
}
