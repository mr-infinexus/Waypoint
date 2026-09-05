/** Global alert banner notifying travelers of active itinerary disruptions */

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Itinerary } from '@/types';

const reviewButtonClass = 'text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shrink-0 shadow-sm font-sans';

export function DisruptionBanner() {
  const [disruptedCount, setDisruptedCount] = useState(0);
  const navigate = useNavigate();
  const { role } = useAuth();

  const fetchDisrupted = () => {
    if (role !== 'traveler') return;

    api('/bookings/my')
      .then((data: Itinerary[]) => {
        const count = (data || []).filter((b) => b.status === 'disrupted').length;
        setDisruptedCount(count);
      })
      .catch(() => { });
  };

  useEffect(() => {
    if (role !== 'traveler') return;

    fetchDisrupted();

    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`/api/bookings/events?token=${encodeURIComponent(token)}`);

    eventSource.addEventListener('disruption', (e) => {
      fetchDisrupted();
      try {
        const payload = JSON.parse(e.data);
        toast.error('Travel Alert', {
          description: payload.message || 'One of your itineraries has been disrupted.',
        });
      } catch {
        toast.error('Travel Alert', {
          description: 'A service disruption affects your booked itinerary.',
        });
      }
    });

    eventSource.addEventListener('resolved', () => {
      fetchDisrupted();
    });

    return () => {
      eventSource.close();
    };
  }, [role]);

  if (disruptedCount === 0) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg backdrop-blur-md z-40">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="font-semibold text-amber-100 text-sm">
            {disruptedCount} {disruptedCount === 1 ? 'trip requires' : 'trips require'} your attention.
          </span>
          <p className="text-xs text-amber-300/80">
            Alternative routes are ready — tap to review and confirm.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/bookings')}
        className={reviewButtonClass}
      >
        <span>Review Bookings</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default DisruptionBanner;
