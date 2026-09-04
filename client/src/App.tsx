import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';
import { RoleGuard } from './components/layout/RoleGuard';
import { TravelerLayout } from './components/layout/TravelerLayout';
import { OperatorLayout } from './components/layout/OperatorLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PageLoader } from './components/PageLoader';

// Dynamic imports for route-level code-splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ItineraryResultsPage = lazy(() => import('./pages/ItineraryResultsPage'));
const ItineraryDetailPage = lazy(() => import('./pages/ItineraryDetailPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StationManagement = lazy(() => import('./pages/StationManagement'));
const OperatorManagement = lazy(() => import('./pages/OperatorManagement'));

function DummyPage({ title }: { title: string }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">This is a placeholder for {title}.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public / Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<DummyPage title="Unauthorized Access" />} />

            {/* Traveler Routes */}
            <Route element={<RoleGuard allowedRoles={['traveler']} />}>
              <Route element={<TravelerLayout />}>
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/results" element={<ItineraryResultsPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
                <Route path="/book" element={<ItineraryDetailPage />} />
              </Route>
            </Route>

            {/* Operator Routes */}
            <Route element={<RoleGuard allowedRoles={['operator']} />}>
              <Route element={<OperatorLayout />}>
                <Route path="/operator" element={<OperatorDashboard />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/stations" element={<StationManagement />} />
                <Route path="/admin/operators" element={<OperatorManagement />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<DummyPage title="404 Not Found" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
