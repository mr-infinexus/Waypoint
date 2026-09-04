import { Request, Response, NextFunction } from 'express';
import { ServiceCatalogService } from '../services/ServiceCatalogService';

const catalogService = new ServiceCatalogService();

export class ServiceController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const operatorId = req.user!.userId;
      const { type, serviceNumber, originStationId, destinationStationId, departureTime, arrivalTime, price, seatCapacity, vehicleLogo } = req.body;
      const service = await catalogService.createService(
        operatorId, type, serviceNumber, originStationId, destinationStationId, new Date(departureTime), new Date(arrivalTime), price, seatCapacity, vehicleLogo
      );
      res.status(201).json(service);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const operatorId = req.user!.userId;
      const { id } = req.params;
      const updates = req.body;
      const service = await catalogService.updateService(operatorId, id as string, updates);
      res.status(200).json(service);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const operatorId = req.user!.userId;
      const { id } = req.params;
      const result = await catalogService.deleteService(operatorId, id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyServices(req: Request, res: Response, next: NextFunction) {
    try {
      const operatorId = req.user!.userId;
      const services = await catalogService.getMyServices(operatorId);
      res.status(200).json(services);
    } catch (error) {
      next(error);
    }
  }
}
