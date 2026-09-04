import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/error.middleware';
import { authenticateJWT } from './middlewares/auth.middleware';
import { requireRole } from './middlewares/role.middleware';
import { UserRole } from './entities/User';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Waypoint API is running' });
});

import adminRoutes from './routes/admin.routes';
import serviceRoutes from './routes/services.routes';
import searchRoutes from './routes/search.routes';
import bookingRoutes from './routes/booking.routes';
import stationsRoutes from './routes/stations.routes';
import docsRoutes from './routes/docs.routes';

// Documentation routes
app.use('/api/docs', docsRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stations', stationsRoutes);

// Test routes for RBAC verification
app.get('/api/admin-only', authenticateJWT, requireRole([UserRole.ADMIN]), (req, res) => {
  res.status(200).json({ message: 'Welcome Admin' });
});

app.use(errorHandler);

export default app;
