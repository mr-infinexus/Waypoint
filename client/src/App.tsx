import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';
import { RoleGuard } from './components/layout/RoleGuard';
import { TravelerLayout } from './components/layout/TravelerLayout';
import { OperatorLayout } from './components/layout/OperatorLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PageLoader } from './components/PageLoader';
import { Button } from './components/ui/button';
import { ShieldAlert, Compass } from 'lucide-react';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ItineraryResultsPage = lazy(() => import('./pages/ItineraryResultsPage'));
const ItineraryDetailPage = lazy(() => import('./pages/ItineraryDetailPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const DisruptionRecoveryPage = lazy(() => import('./pages/DisruptionRecoveryPage'));
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StationManagement = lazy(() => import('./pages/StationManagement'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));

function StatusView({ title, message, isAuth = false }: { title: string; message: string; isAuth?: boolean }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4 bg-card/60 backdrop-blur-md border border-border/50 p-8 rounded-2xl shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          {isAuth ? <ShieldAlert className="w-7 h-7" /> : <Compass className="w-7 h-7" />}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="pt-2">
          <Link to="/">
            <Button size="sm" className="rounded-xl px-5">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<StatusView title="Access Denied" message="You do not have permission to view this resource." isAuth />} />

            <Route element={<RoleGuard allowedRoles={['traveler']} />}>
              <Route element={<TravelerLayout />}>
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/results" element={<ItineraryResultsPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
                <Route path="/book" element={<ItineraryDetailPage />} />
                <Route path="/disruption/:id" element={<DisruptionRecoveryPage />} />
              </Route>
            </Route>

            <Route element={<RoleGuard allowedRoles={['operator']} />}>
              <Route element={<OperatorLayout />}>
                <Route path="/operator" element={<OperatorDashboard />} />
              </Route>
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/stations" element={<StationManagement />} />
                <Route path="/admin/accounts" element={<AccountManagement />} />
              </Route>
            </Route>

            <Route path="*" element={<StatusView title="Page Not Found" message="The requested page does not exist." />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
