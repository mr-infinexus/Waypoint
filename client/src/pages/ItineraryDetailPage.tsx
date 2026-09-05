import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { SearchResultPath, Itinerary, Service, WalkLeg, ServiceType } from '@/types';
import { JourneyTimeline } from '@/components/JourneyTimeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Map as MapIcon,
  Plane,
  TrainFront,
  Bus,
  TramFront,
  Footprints,
  Loader2,
  Calendar,
  Ticket as TicketIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const getTransitIcon = (mode: ServiceType) => {
  switch (mode) {
    case 'flight': return Plane;
    case 'train': return TrainFront;
    case 'bus': return Bus;
    case 'metro': return TramFront;
    case 'walk':
    default:
      return Footprints;
  }
};

const formatDisplayDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function ItineraryDetailPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const prebookedPath: SearchResultPath | undefined = state?.path;

  const [itinerary, setItinerary] = useState<Itinerary | null>(state?.updatedItinerary || null);
  const [loading, setLoading] = useState(Boolean(id) && !state?.updatedItinerary);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const isBooked = Boolean(id);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    api(`/bookings/my/${id}`)
      .then((data: Itinerary) => {
        if (!isMounted) return;
        setItinerary(data);
        setError('');
      })
      .catch((err: { message?: string }) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load booking details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading journey details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] space-y-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <Button onClick={() => navigate('/search')} variant="outline" className="rounded-lg text-xs">
          Return to Planner
        </Button>
      </div>
    );
  }

  const activeSegments = isBooked
    ? (itinerary?.segments || [])
      .filter((s) => !s.tickets || s.tickets.length === 0 || s.tickets.some((t) => t.status !== 'cancelled'))
      .slice()
      .sort((a, b) => a.segmentOrder - b.segmentOrder)
    : [];

  const services: Service[] = isBooked
    ? activeSegments.map((s) => s.service)
    : prebookedPath?.services || [];

  const originWalk: WalkLeg | null | undefined = isBooked ? itinerary?.originWalk : prebookedPath?.originWalk;
  const destinationWalk: WalkLeg | null | undefined = isBooked ? itinerary?.destinationWalk : prebookedPath?.destinationWalk;
  const totalPrice: number = isBooked ? Number(itinerary?.totalCost || 0) : Number(prebookedPath?.totalPrice || 0);

  if (!isBooked && !prebookedPath) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] space-y-3 text-center">
        <p className="text-sm text-muted-foreground">No route selected for booking.</p>
        <Button onClick={() => navigate('/search')} className="rounded-lg text-xs">
          Search Routes
        </Button>
      </div>
    );
  }

  const handleConfirmBooking = async () => {
    setBooking(true);
    try {
      const serviceIds = services.map((s) => s.id);
      await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({ serviceIds }),
      });
      navigate('/bookings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      alert(msg);
    } finally {
      setBooking(false);
    }
  };

  const mapPoints: { name: string; pos: [number, number] }[] = [];
  services.forEach((s) => {
    if (s.originStation?.latitude !== undefined && s.originStation?.longitude !== undefined && s.originStation?.latitude !== null && s.originStation?.longitude !== null) {
      mapPoints.push({
        name: `${s.originStation.name} (${s.originStation.code})`,
        pos: [s.originStation.latitude, s.originStation.longitude],
      });
    }
    if (s.destinationStation?.latitude !== undefined && s.destinationStation?.longitude !== undefined && s.destinationStation?.latitude !== null && s.destinationStation?.longitude !== null) {
      mapPoints.push({
        name: `${s.destinationStation.name} (${s.destinationStation.code})`,
        pos: [s.destinationStation.latitude, s.destinationStation.longitude],
      });
    }
  });

  const polylinePositions: [number, number][] = mapPoints.map((p) => p.pos);
  const mapCenter: [number, number] = mapPoints.length > 0 ? mapPoints[0].pos : [21.937, 78.9629];
  const isDisrupted = itinerary?.status === 'disrupted';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-lg h-9 w-9 border-border/80 shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {isBooked ? 'Trip Itinerary' : 'Confirm Booking'}
          </h1>
          {services.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(services[0].departureTime), 'EEEE, MMMM d, yyyy')}</span>
              <span>•</span>
              <span className="font-medium text-foreground">
                {services[0].originStation.city} → {services[services.length - 1].destinationStation.city}
              </span>
            </p>
          )}
        </div>
      </div>

      {state?.updatedItinerary && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Rebooking Confirmed — Updated Journey Active</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your new route schedule is active and updated tickets are confirmed. All obsolete tickets have been voided.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs font-semibold shrink-0">
            Confirmed Active
          </Badge>
        </div>
      )}

      {isDisrupted && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Service Disruption — Action Required</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {itinerary?.pendingAlternatives && itinerary.pendingAlternatives.length > 0
                  ? `${itinerary.pendingAlternatives.length} alternative route${itinerary.pendingAlternatives.length > 1 ? 's' : ''} are ready for you to review and confirm.`
                  : 'Your itinerary has been disrupted. No automatic alternatives were found — please search manually.'}
              </p>
            </div>
          </div>
          {itinerary?.pendingAlternatives && itinerary.pendingAlternatives.length > 0 ? (
            <Button
              onClick={() => navigate(`/disruption/${itinerary!.id}`)}
              className="text-xs rounded-lg shrink-0 h-9 px-4 font-semibold"
            >
              Review Alternatives
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/search')}
              variant="outline"
              className="text-xs rounded-lg shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              Search Manually
            </Button>
          )}
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-5 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/40 min-w-0">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Total Fare</span>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
              ₹{totalPrice.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isBooked && prebookedPath && (
              <div className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted/50 px-3 py-1 rounded-md border border-border/50">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatDisplayDuration(prebookedPath.totalDisplayDurationMs)}</span>
              </div>
            )}

            {isBooked && itinerary && (
              <Badge
                variant="outline"
                className={`text-[11px] font-medium py-1 px-3 rounded-md ${itinerary.status === 'active'
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : itinerary.status === 'disrupted'
                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                    : 'border-border/60 text-muted-foreground bg-muted/40'
                  }`}
              >
                {itinerary.status === 'active' ? 'Confirmed Active' : itinerary.status}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-muted-foreground block mb-3">
            Journey Sequence & Guaranteed Layover Buffers
          </span>
          <div className="w-full min-w-0 max-w-full overflow-x-auto custom-scrollbar overscroll-x-contain py-1">
            <JourneyTimeline
              services={services}
              originWalk={originWalk}
              destinationWalk={destinationWalk}
            />
          </div>
        </div>

        {!isBooked && (
          <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              By confirming, tickets will be generated and stored securely in your bookings.
            </p>
            <Button
              onClick={handleConfirmBooking}
              disabled={booking}
              className="w-full sm:w-auto h-9 px-4 rounded-lg font-medium text-xs shadow-xs"
            >
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking Tickets...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm & Pay ₹{totalPrice.toLocaleString('en-IN')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {mapPoints.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold tracking-tight text-foreground">Route Geo-Trajectory</h2>
          </div>
          <div className="h-[280px] sm:h-[320px] w-full rounded-xl overflow-hidden border border-border/60 relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={5}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: 'oklch(0.729 0.1306 86.6)',
                  weight: 3,
                  dashArray: '6, 8',
                }}
              />
              {mapPoints.map((pt, i) => (
                <CircleMarker
                  key={i}
                  center={pt.pos}
                  radius={5}
                  pathOptions={{
                    color: 'oklch(0.729 0.1306 86.6)',
                    fillColor: 'oklch(0.2598 0.0306 262.7)',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>{pt.name}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {isBooked && itinerary && (
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col sm:flex-row items-center gap-5">
          <div className="bg-white p-3 rounded-xl border border-border/40 shadow-2xs shrink-0">
            <QRCodeSVG
              value={`waypoint-itinerary-${itinerary.id}`}
              size={110}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <TicketIcon className="w-4 h-4" />
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Digital Boarding Pass
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-foreground">
              Booking Ref: {itinerary.id}
            </div>
            <p className="text-xs text-muted-foreground">
              Present this QR code for scanning at station validation gates and transit operators.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Transit Leg Breakdown
        </h2>
        <div className="grid gap-3">
          {services.map((service, idx) => {
            const ModeIcon = getTransitIcon(service.type);
            const seg = isBooked ? activeSegments[idx] : undefined;
            const ticket = seg?.tickets?.find((t) => t.status === 'valid') || seg?.tickets?.[0];

            return (
              <div
                key={service.id || idx}
                className="p-4 rounded-xl bg-card border border-border/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-border transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted border border-border/60 text-muted-foreground shrink-0">
                    <ModeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">
                      {service.originStation.city} ({service.originStation.code}) → {service.destinationStation.city} ({service.destinationStation.code})
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      <span className="capitalize font-medium">{service.type}</span>
                      <span>•</span>
                      <span>{service.operator?.name || 'Transit Line'} {service.serviceNumber}</span>
                      {service.isCancelled ? (
                        <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-500/10 text-[10px] font-bold">
                          Cancelled
                        </Badge>
                      ) : service.isDelayed ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] font-semibold">
                          {itinerary?.status === 'active' ? 'Schedule Adjusted' : 'Delayed'}
                        </Badge>
                      ) : null}
                      {ticket && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold py-0.5 px-2 rounded-md ${ticket.status === 'valid'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-muted text-muted-foreground bg-muted/40'
                            }`}
                        >
                          {ticket.status === 'valid' ? 'Ticket Confirmed' : ticket.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                  <div className="text-left md:text-right font-mono text-xs">
                    <div className="font-medium text-foreground">
                      {format(new Date(service.departureTime), 'HH:mm')} - {format(new Date(service.arrivalTime), 'HH:mm')}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {format(new Date(service.departureTime), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-foreground text-sm">
                      ₹{Number(service.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ItineraryDetailPage;
