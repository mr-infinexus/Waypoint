import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';

const router = Router();

// Public route for stations
router.get('/', AdminController.listStations);

export default router;
