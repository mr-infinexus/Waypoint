import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

// Protect booking routes: only TRAVELER can book (maybe Admin/Operator can too, but let's stick to TRAVELER)
// Actually, let's just authenticateJWT. Any user could technically book a trip. Let's allow everyone or TRAVELER.
router.use(authenticateJWT, requireRole([UserRole.TRAVELER]));

router.post('/', BookingController.createBooking);
router.get('/my', BookingController.getMyBookings);

export default router;
