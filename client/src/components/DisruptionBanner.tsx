import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Itinerary } from '@/types';

export function DisruptionBanner() {
  const [disruptedBookings, setDisruptedBookings] = useState<Itinerary[]>([]);
  const navigate = useNavigate();
  const { role } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (role !== 'traveler') return;

    api('/bookings/my')
      .then((data: Itinerary[]) => {
        const disrupted = data.filter((booking) =>
          booking.status === 'disrupted' ||
          booking.status === 'cancelled' ||
          booking.segments?.some((seg) => seg.service?.isDelayed || seg.service?.isCancelled)
        );
        setDisruptedBookings(disrupted);
      })
      .catch(() => {
        // Ignore network errors
      });
  }, [role, location.pathname]);

  if (disruptedBookings.length === 0) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg backdrop-blur-md z-40">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="font-semibold text-amber-100 text-sm">
            {disruptedBookings.length} {disruptedBookings.length === 1 ? 'trip has' : 'trips have'} delays or disruptions.
          </span>
          <p className="text-xs text-amber-300/80">
            Review updated schedules or find alternative routes.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/bookings')}
        className="text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shrink-0 shadow-sm font-sans"
      >
        <span>View Bookings</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
