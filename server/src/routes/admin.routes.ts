import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

// Protect all admin routes
router.use(authenticateJWT, requireRole([UserRole.ADMIN]));

router.post('/stations', AdminController.createStation);
router.get('/stations', AdminController.listStations);

router.post('/operators', AdminController.onboardOperator);
router.get('/operators', AdminController.listOperators);
router.post('/operators/:id/suspend', AdminController.suspendOperator);

router.get('/stats', AdminController.getDashboardStats);

export default router;
