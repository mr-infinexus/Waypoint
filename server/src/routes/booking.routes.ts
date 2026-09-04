import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authenticateJWT, requireRole([UserRole.TRAVELER]));

router.post('/', BookingController.createBooking);
router.get('/events', BookingController.streamDisruptions);
router.get('/my', BookingController.getMyBookings);
router.get('/my/:id', BookingController.getBookingById);
router.post('/my/:id/accept-alternative', BookingController.acceptAlternative);

export default router;
