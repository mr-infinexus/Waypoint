import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Itinerary, SearchResultPath } from '@/types';
import { JourneyTimeline } from '@/components/JourneyTimeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shuffle,
  Banknote,
  Loader2,
  ShieldOff,
  Zap,
  WifiOff,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function DisruptionRecoveryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    api(`/bookings/my/${id}`)
      .then((data: Itinerary) => {
        setItinerary(data);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || 'Failed to load itinerary');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleAccept = async (index: number, fareDifference: number) => {
    if (!itinerary) return;
    setAccepting(index);
    try {
      const updated = await api(`/bookings/my/${itinerary.id}/accept-alternative`, {
        method: 'POST',
        body: JSON.stringify({ alternativeIndex: index }),
      });
      if (fareDifference > 0) {
        toast.success('Route confirmed & payment processed', {
          description: `Paid ₹${fareDifference.toLocaleString('en-IN')} fare difference. Your updated itinerary is confirmed.`,
        });
      } else if (fareDifference < 0) {
        toast.success('Route confirmed & refund initiated', {
          description: `₹${Math.abs(fareDifference).toLocaleString('en-IN')} will be refunded to your account. Your updated itinerary is confirmed.`,
        });
      } else {
        toast.success('Route confirmed', {
          description: 'Your itinerary has been rebooked at no additional charge.',
        });
      }
      navigate(`/itinerary/${itinerary.id}`, { replace: true, state: { updatedItinerary: updated } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept alternative';
      toast.error(msg);
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading disruption details...</p>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] space-y-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/20 text-center max-w-lg mx-auto">
        <WifiOff className="w-8 h-8 text-destructive" />
        <p className="text-sm font-semibold text-destructive">{error || 'Itinerary not found'}</p>
        <Button onClick={() => navigate('/bookings')} variant="outline" className="rounded-lg text-xs">
          Back to Bookings
        </Button>
      </div>
    );
  }

  if (itinerary.status !== 'disrupted') {
    navigate(`/itinerary/${itinerary.id}`);
    return null;
  }

  const segments = [...(itinerary.segments || [])].sort((a, b) => a.segmentOrder - b.segmentOrder);
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const cancelledIdx = segments.findIndex(s => s.service.isCancelled);
  const delayedIdx = segments.findIndex(s => s.service.isDelayed);
  const cutFrom = cancelledIdx !== -1 ? cancelledIdx : (delayedIdx !== -1 ? delayedIdx + 1 : 0);

  const disruptedSeg = segments.find(s => s.service.isDelayed || s.service.isCancelled);
  const obsoleteSegments = segments.slice(cutFrom);
  const oldLegsCost = obsoleteSegments.reduce((sum, s) => sum + Number(s.service.price || 0), 0);
  const alternatives: SearchResultPath[] = itinerary.pendingAlternatives || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/bookings')}
          className="rounded-lg h-9 w-9 border-border/80 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Service Disruption</h1>
          {firstSeg && lastSeg && (
            <p className="text-xs text-muted-foreground mt-1">
              {firstSeg.service.originStation.city} → {lastSeg.service.destinationStation.city}
              {' • '}
              Ref: {itinerary.id.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-amber-500/8 border border-amber-500/30 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-foreground text-sm">Your connection is broken</h2>
            {disruptedSeg && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-amber-300">
                  {disruptedSeg.service.serviceNumber}
                </span>
                {' '}
                ({disruptedSeg.service.originStation.code} → {disruptedSeg.service.destinationStation.code})
                {' '}
                {disruptedSeg.service.isCancelled ? 'has been cancelled' : 'is delayed'}.
                {obsoleteSegments.length > 0 && (
                  <span>
                    {' '}Your ticket for {obsoleteSegments.map(s => `${s.service.serviceNumber} (${s.service.originStation.code} → ${s.service.destinationStation.code})`).join(', ')} cannot be fulfilled as scheduled.
                  </span>
                )}
                {' '}Select an alternative route below to rebook.
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className="ml-auto shrink-0 border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider"
          >
            Action Required
          </Badge>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Original Ticket Credit (Unused Leg):</span>
            <span className="font-bold text-foreground">₹{oldLegsCost.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Credit applied directly towards your selected alternative route
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your original journey</p>
          <div className="w-full min-w-0 overflow-x-auto custom-scrollbar overscroll-x-contain py-1">
            <JourneyTimeline
              services={segments.map(s => s.service)}
              originWalk={itinerary.originWalk}
              destinationWalk={itinerary.destinationWalk}
            />
          </div>
        </div>
      </div>

      {alternatives.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Alternative Routes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alternatives.length} option{alternatives.length > 1 ? 's' : ''} found from your disruption point. Selecting an option will void obsolete tickets and confirm your new itinerary.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {alternatives.map((alt, idx) => {
              const isAccepting = accepting === idx;
              const firstAlt = alt.services[0];
              const lastAlt = alt.services[alt.services.length - 1];
              const newFare = Number(alt.totalPrice);
              const diff = newFare - oldLegsCost;
              const isExtraPayable = diff > 0;
              const isRefund = diff < 0;
              const refundAmount = Math.abs(diff);

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:border-primary/40 transition-all duration-150 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-bold">₹{newFare.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-muted-foreground font-normal">(New fare)</span>
                      </div>

                      {isExtraPayable && (
                        <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold px-2.5 py-0.5">
                          +₹{diff.toLocaleString('en-IN')} Difference
                        </Badge>
                      )}

                      {isRefund && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
                          ₹{refundAmount.toLocaleString('en-IN')} Refund
                        </Badge>
                      )}

                      {!isExtraPayable && !isRefund && (
                        <Badge className="bg-muted text-muted-foreground border border-border/40 text-xs font-semibold px-2.5 py-0.5">
                          No Extra Charge
                        </Badge>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/40">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{formatDuration(alt.totalDisplayDurationMs)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/25 px-2 py-1 rounded-md border border-border/40">
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>
                          {alt.transfers === 0 ? 'Direct' : `${alt.transfers} Transfer${alt.transfers > 1 ? 's' : ''}`}
                        </span>
                      </div>

                      {idx === 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/25 font-medium">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Recommended</span>
                        </div>
                      )}
                    </div>

                    {firstAlt && lastAlt && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {format(new Date(firstAlt.departureTime), 'HH:mm')} → {format(new Date(lastAlt.arrivalTime), 'HH:mm')}
                      </span>
                    )}
                  </div>

                  <div className="w-full min-w-0 overflow-x-auto custom-scrollbar overscroll-x-contain py-1">
                    <JourneyTimeline
                      services={alt.services}
                      originWalk={alt.originWalk}
                      destinationWalk={alt.destinationWalk}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>New route total</span>
                      <span className="font-medium text-foreground">₹{newFare.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Unused ticket credit ({obsoleteSegments.map(s => s.service.serviceNumber).join(', ')})</span>
                      <span className="font-medium text-emerald-400">-₹{oldLegsCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between font-semibold">
                      <span>{isExtraPayable ? 'Payable difference amount' : isRefund ? 'Refund credited to traveler' : 'Balance payable'}</span>
                      <span className={isExtraPayable ? 'text-amber-400 font-bold text-sm' : isRefund ? 'text-emerald-400 font-bold text-sm' : 'text-foreground'}>
                        {isExtraPayable ? `+₹${diff.toLocaleString('en-IN')}` : isRefund ? `-₹${refundAmount.toLocaleString('en-IN')}` : '₹0 (Fully Covered)'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {isExtraPayable
                        ? `Pay difference of ₹${diff.toLocaleString('en-IN')} to confirm new bookings.`
                        : isRefund
                        ? `Claim ₹${refundAmount.toLocaleString('en-IN')} refund and confirm new bookings.`
                        : 'Old tickets voided and replaced with new bookings at no extra charge.'}
                    </p>
                    <Button
                      id={`btn-accept-alternative-${idx}`}
                      onClick={() => handleAccept(idx, diff)}
                      disabled={accepting !== null}
                      className={`w-full sm:w-auto h-10 px-5 rounded-lg font-semibold text-xs shadow-xs transition-all ${
                        isExtraPayable
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : isRefund
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : ''
                      }`}
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isExtraPayable ? 'Processing Payment...' : 'Confirming...'}
                        </>
                      ) : isExtraPayable ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Difference (₹{diff.toLocaleString('en-IN')}) & Confirm
                        </>
                      ) : isRefund ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirm Route & Claim ₹{refundAmount.toLocaleString('en-IN')} Refund
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirm Rebooking (No Extra Charge)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-card border border-border/60 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
            <ShieldOff className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No alternatives available</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No connecting routes were found from your disruption point. Please contact support or search manually.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/search')}
              className="rounded-lg text-xs h-9"
            >
              Search Routes Manually
            </Button>
            <Button
              onClick={() => navigate('/bookings')}
              variant="ghost"
              className="rounded-lg text-xs h-9"
            >
              Back to Bookings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisruptionRecoveryPage;
