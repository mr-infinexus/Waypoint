import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Itinerary } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import {
  Loader2,
  Calendar,
  MapPin,
  Search,
  Ticket,
  ArrowRight,
  Plane,
  TrainFront,
  Bus,
  TramFront,
} from 'lucide-react';

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'flight': return Plane;
    case 'train': return TrainFront;
    case 'bus': return Bus;
    case 'metro': return TramFront;
    default: return TrainFront;
  }
};

const getStatusBadge = (status: Itinerary['status']) => {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    case 'disrupted':
      return { label: 'Disrupted', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    case 'completed':
    default:
      return { label: 'Completed', className: 'bg-muted/60 text-muted-foreground border-border/40' };
  }
};

export function BookingsPage() {
  const [bookings, setBookings] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/bookings/my')
      .then((data: Itinerary[]) => {
        setBookings(data || []);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || 'Failed to fetch itineraries');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Retrieving your bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4 p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center">
        <p className="text-base font-bold text-destructive">{error}</p>
        <Button onClick={() => navigate('/search')} className="rounded-xl">
          Find a Route
        </Button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 card-glass p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-primary/15 border border-primary/30 rounded-2xl flex items-center justify-center text-primary mb-2">
          <Ticket className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">No bookings yet</h2>
          <p className="text-sm text-muted-foreground">
            You don't have any booked multi-modal itineraries yet. Start planning your next journey across India.
          </p>
        </div>
        <Button onClick={() => navigate('/search')} size="lg" className="rounded-xl mt-2 font-bold shadow-lg shadow-primary/20">
          <Search className="w-4 h-4 mr-2" />
          Search Routes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your multi-modal boarding passes, QR validation codes, and live trip status.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {bookings.map((booking) => {
          const segments = [...(booking.segments || [])]
            .filter((s) => !s.tickets || s.tickets.length === 0 || s.tickets.some((t) => t.status !== 'cancelled'))
            .sort((a, b) => a.segmentOrder - b.segmentOrder);
          const firstService = segments[0]?.service;
          const lastService = segments[segments.length - 1]?.service;

          if (!firstService || !lastService) return null;

          const statusBadge = getStatusBadge(booking.status);

          return (
            <div
              key={booking.id}
              onClick={() => navigate(`/itinerary/${booking.id}`)}
              className="card-glass p-0 hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="flex flex-col md:flex-row">
                <div className="bg-muted/30 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/40 shrink-0 min-w-[180px]">
                  <div className="bg-white p-3 rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-md">
                    <QRCodeSVG
                      value={`waypoint-itinerary-${booking.id}`}
                      size={110}
                      level="H"
                    />
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-extrabold uppercase tracking-widest py-1 px-3 rounded-lg border ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </Badge>
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{format(new Date(booking.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-3xl font-black tracking-tight text-foreground">
                          {firstService.originStation.code}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{firstService.originStation.city}</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-primary mt-2">
                          {format(new Date(firstService.departureTime), 'HH:mm')}
                        </div>
                      </div>

                      <div className="flex-1 px-4 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground mb-1">
                          {segments.map((seg, i) => {
                            const ModeIcon = getModeIcon(seg.service.type);
                            return (
                              <span key={i} className="flex items-center gap-1">
                                <ModeIcon className="w-4 h-4 text-primary" />
                                {i < segments.length - 1 && <span className="text-muted-foreground/40">›</span>}
                              </span>
                            );
                          })}
                        </div>
                        <div className="w-full border-t-2 border-dashed border-border relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[11px] font-bold text-muted-foreground uppercase">
                            {segments.length} {segments.length === 1 ? 'Leg' : 'Legs'}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-1">
                          ₹{Number(booking.totalCost).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                          {lastService.destinationStation.code}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{lastService.destinationStation.city}</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-primary mt-2">
                          {format(new Date(lastService.arrivalTime), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {booking.status === 'disrupted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/disruption/${booking.id}`);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors px-3 py-1.5 rounded-lg shrink-0"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Review Alternatives
                      </button>
                    )}
                    <span className="font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 self-end sm:self-auto ml-auto">
                      <span>View Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BookingsPage;
