import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';

const router = Router();

router.get('/', AdminController.listStations);

export default router;
