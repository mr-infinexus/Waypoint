import { Router } from 'express';
import { ServiceController } from '../controllers/ServiceController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

// Protect all these routes for Operators only
router.use(authenticateJWT, requireRole([UserRole.OPERATOR]));

import { DisruptionController } from '../controllers/DisruptionController';

router.post('/', ServiceController.create);
router.get('/my', ServiceController.getMyServices);
router.patch('/:id', ServiceController.update);
router.delete('/:id', ServiceController.delete);
router.post('/:serviceId/disruptions/delay', DisruptionController.reportDelay);

export default router;
