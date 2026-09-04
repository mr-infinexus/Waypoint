import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';

const adminService = new AdminService();

export class AdminController {
  static async createStation(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, city, latitude, longitude } = req.body;
      const station = await adminService.createStation(code, name, city, latitude, longitude);
      res.status(201).json(station);
    } catch (error) {
      next(error);
    }
  }

  static async listStations(req: Request, res: Response, next: NextFunction) {
    try {
      const stations = await adminService.getAllStations();
      res.status(200).json(stations);
    } catch (error) {
      next(error);
    }
  }

  static async onboardOperator(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const operator = await adminService.onboardOperator(name, email, password);
      res.status(201).json(operator);
    } catch (error) {
      next(error);
    }
  }

  static async listOperators(req: Request, res: Response, next: NextFunction) {
    try {
      const operators = await adminService.listOperators();
      res.status(200).json(operators);
    } catch (error) {
      next(error);
    }
  }

  static async suspendOperator(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await adminService.suspendOperator(id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
}
