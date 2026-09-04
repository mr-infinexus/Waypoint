import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authenticateJWT, requireRole([UserRole.ADMIN]));

router.post('/stations', AdminController.createStation);
router.get('/stations', AdminController.listStations);

router.get('/operators', AdminController.listOperators);
router.post('/operators/:id/suspend', AdminController.suspendOperator);
router.post('/operators/:id/activate', AdminController.activateOperator);

router.get('/users', AdminController.listUsers);
router.post('/users/:id/suspend', AdminController.suspendUser);
router.post('/users/:id/activate', AdminController.activateUser);

router.get('/stats', AdminController.getDashboardStats);

export default router;
