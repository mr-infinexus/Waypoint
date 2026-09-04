import { Router } from 'express';
import { ServiceController } from '../controllers/ServiceController';
import { DisruptionController } from '../controllers/DisruptionController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authenticateJWT, requireRole([UserRole.OPERATOR]));

router.post('/', ServiceController.create);
router.get('/my', ServiceController.getMyServices);
router.patch('/:id', ServiceController.update);
router.delete('/:id', ServiceController.delete);
router.post('/:serviceId/disruptions/delay', DisruptionController.reportDelay);
router.post('/:serviceId/disruptions/cancel', DisruptionController.reportCancellation);

export default router;
