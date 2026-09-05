import { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import type { Service, Station, ServiceType } from '@/types';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  AlertTriangle,
  Clock,
  Plus,
  Plane,
  TrainFront,
  Bus,
  TramFront,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const getTransitIcon = (mode: ServiceType) => {
  switch (mode) {
    case 'flight': return Plane;
    case 'train': return TrainFront;
    case 'bus': return Bus;
    case 'metro': return TramFront;
    default: return TrainFront;
  }
};

const DELAY_PRESETS = [15, 30, 45, 60, 120];

const DELAY_REASONS = [
  'Technical / Mechanical Maintenance',
  'Adverse Weather / Low Visibility',
  'Signal / Traffic Clearance Hold',
  'Air Traffic Control / Runway Delay',
  'Crew / Fleet Operational Reschedule',
  'Station Congestion / Platform Hold',
  'Other Operational Delay',
];

export function OperatorDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<{ [field: string]: string }>({});

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [delayDialog, setDelayDialog] = useState<{
    isOpen: boolean;
    service: Service | null;
    minutes: number;
    reason: string;
    customDescription: string;
  }>({
    isOpen: false,
    service: null,
    minutes: 30,
    reason: DELAY_REASONS[0],
    customDescription: '',
  });

  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    service: Service | null;
    reason: string;
  }>({
    isOpen: false,
    service: null,
    reason: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on-time' | 'delayed' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [formData, setFormData] = useState({
    type: 'train' as ServiceType,
    serviceNumber: '',
    originStationId: '',
    destinationStationId: '',
    departureTime: '',
    arrivalTime: '',
    price: '',
  });

  const fetchServices = async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const data = await api('/services/my');
      setServices(data || []);
      setError('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load operator services';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    api('/services/my')
      .then((data: Service[]) => {
        if (!isMounted) return;
        setServices(data || []);
      })
      .catch((err: { message?: string }) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load operator services');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    api('/stations')
      .then((data: Station[]) => {
        if (!isMounted) return;
        setStations(data || []);
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  const openDelayDialog = (service: Service) => {
    setDelayDialog({
      isOpen: true,
      service,
      minutes: 30,
      reason: DELAY_REASONS[0],
      customDescription: '',
    });
  };

  const handleConfirmDelay = async () => {
    if (!delayDialog.service) return;
    const { service, minutes, reason, customDescription } = delayDialog;

    if (!minutes || minutes <= 0) {
      toast.error('Enter a valid delay in minutes.');
      return;
    }

    const newArrival = new Date(new Date(service.arrivalTime).getTime() + Number(minutes) * 60000);
    const descriptionText = customDescription.trim()
      ? `${reason}: ${customDescription.trim()} (+${minutes}m)`
      : `${reason} (+${minutes}m)`;

    setActionLoadingId(service.id);
    try {
      await api(`/services/${service.id}/disruptions/delay`, {
        method: 'POST',
        body: JSON.stringify({
          newArrivalTime: newArrival.toISOString(),
          description: descriptionText,
        }),
      });

      toast.success(
        `Delay of ${minutes}m reported for ${service.serviceNumber}`,
        { description: `New arrival: ${format(newArrival, 'HH:mm (MMM d)')}` }
      );

      setDelayDialog((prev) => ({ ...prev, isOpen: false }));
      await fetchServices(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to report delay';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCancelDialog = (service: Service) => {
    setCancelDialog({
      isOpen: true,
      service,
      reason: '',
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog.service) return;
    const { service } = cancelDialog;
    const reason = cancelDialog.reason?.trim();

    setActionLoadingId(service.id);
    try {
      await api(`/services/${service.id}/disruptions/cancel`, {
        method: 'POST',
        body: JSON.stringify({ description: reason || undefined }),
      });

      toast.success(
        `Service ${service.serviceNumber} cancelled`,
        { description: 'Affected passengers alerted and shown re-route options.' }
      );

      setCancelDialog({ isOpen: false, service: null, reason: '' });
      await fetchServices(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateService = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.serviceNumber.trim()) {
      errors.serviceNumber = 'Required.';
    }

    if (!formData.originStationId) {
      errors.originStationId = 'Required.';
    }

    if (!formData.destinationStationId) {
      errors.destinationStationId = 'Required.';
    } else if (formData.originStationId === formData.destinationStationId) {
      errors.destinationStationId = 'Must differ from origin.';
    }

    if (!formData.departureTime) {
      errors.departureTime = 'Required.';
    }

    if (!formData.arrivalTime) {
      errors.arrivalTime = 'Required.';
    } else if (formData.departureTime) {
      const dep = new Date(formData.departureTime).getTime();
      const arr = new Date(formData.arrivalTime).getTime();
      if (arr <= dep) {
        errors.arrivalTime = 'Must be after departure.';
      }
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Must be positive.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      toast.error('Resolve form errors.');
      return;
    }

    setCreateErrors({});
    setCreating(true);

    try {
      await api('/services', {
        method: 'POST',
        body: JSON.stringify({
          type: formData.type,
          serviceNumber: formData.serviceNumber.trim().toUpperCase(),
          originStationId: formData.originStationId,
          destinationStationId: formData.destinationStationId,
          departureTime: new Date(formData.departureTime).toISOString(),
          arrivalTime: new Date(formData.arrivalTime).toISOString(),
          price: priceNum,
        }),
      });

      toast.success(`Service ${formData.serviceNumber.toUpperCase()} created.`);
      setIsCreateOpen(false);
      setFormData({
        type: 'train',
        serviceNumber: '',
        originStationId: '',
        destinationStationId: '',
        departureTime: '',
        arrivalTime: '',
        price: '',
      });
      await fetchServices(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create service';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNumber = service.serviceNumber.toLowerCase().includes(query);
        const matchesOriginCity = service.originStation.city.toLowerCase().includes(query);
        const matchesOriginCode = service.originStation.code.toLowerCase().includes(query);
        const matchesDestCity = service.destinationStation.city.toLowerCase().includes(query);
        const matchesDestCode = service.destinationStation.code.toLowerCase().includes(query);

        if (!matchesNumber && !matchesOriginCity && !matchesOriginCode && !matchesDestCity && !matchesDestCode) {
          return false;
        }
      }

      if (statusFilter === 'cancelled' && !service.isCancelled) return false;
      if (statusFilter === 'delayed' && (!service.isDelayed || service.isCancelled)) return false;
      if (statusFilter === 'on-time' && (service.isDelayed || service.isCancelled)) return false;

      return true;
    });
  }, [services, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / ITEMS_PER_PAGE));
  const paginatedServices = useMemo(() => {
    return filteredServices.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filteredServices, page]);

  const counts = useMemo(() => {
    let onTime = 0;
    let delayed = 0;
    let cancelled = 0;

    services.forEach((s) => {
      if (s.isCancelled) cancelled++;
      else if (s.isDelayed) delayed++;
      else onTime++;
    });

    return {
      all: services.length,
      onTime,
      delayed,
      cancelled,
    };
  }, [services]);

  if (loading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Operator Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fleet schedule and live disruption controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg font-medium h-8 text-sm px-3">
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-card border-border rounded-xl p-5">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-foreground">New Transit Service</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Schedule routing, times, capacity, and pricing.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateService} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Mode</label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) => setFormData({ ...formData, type: val as ServiceType })}
                    >
                      <SelectTrigger className="h-8 bg-background/50 border-border/70 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="train" className="text-sm">Train</SelectItem>
                        <SelectItem value="flight" className="text-sm">Flight</SelectItem>
                        <SelectItem value="bus" className="text-sm">Bus</SelectItem>
                        <SelectItem value="metro" className="text-sm">Metro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Service Number</label>
                    <Input
                      required
                      placeholder="e.g. 12951"
                      value={formData.serviceNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, serviceNumber: e.target.value });
                        if (createErrors.serviceNumber) setCreateErrors((prev) => ({ ...prev, serviceNumber: '' }));
                      }}
                      className={`h-8 bg-background/50 rounded-lg uppercase font-mono text-sm ${createErrors.serviceNumber ? 'border-destructive' : 'border-border/70'
                        }`}
                    />
                    {createErrors.serviceNumber && (
                      <p className="text-[10px] text-destructive">{createErrors.serviceNumber}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Origin</label>
                    <Select
                      value={formData.originStationId}
                      onValueChange={(val) => {
                        setFormData({ ...formData, originStationId: val });
                        if (createErrors.originStationId) setCreateErrors((prev) => ({ ...prev, originStationId: '' }));
                      }}
                    >
                      <SelectTrigger className={`h-8 bg-background/50 rounded-lg text-sm ${createErrors.originStationId ? 'border-destructive' : 'border-border/70'
                        }`}>
                        <SelectValue placeholder="Select Origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-sm">
                            {s.code} - {s.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {createErrors.originStationId && (
                      <p className="text-[10px] text-destructive">{createErrors.originStationId}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Destination</label>
                    <Select
                      value={formData.destinationStationId}
                      onValueChange={(val) => {
                        setFormData({ ...formData, destinationStationId: val });
                        if (createErrors.destinationStationId) setCreateErrors((prev) => ({ ...prev, destinationStationId: '' }));
                      }}
                    >
                      <SelectTrigger className={`h-8 bg-background/50 rounded-lg text-sm ${createErrors.destinationStationId ? 'border-destructive' : 'border-border/70'
                        }`}>
                        <SelectValue placeholder="Select Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-sm">
                            {s.code} - {s.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {createErrors.destinationStationId && (
                      <p className="text-[10px] text-destructive">{createErrors.destinationStationId}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Departure</label>
                    <Input
                      required
                      type="datetime-local"
                      value={formData.departureTime}
                      onChange={(e) => {
                        setFormData({ ...formData, departureTime: e.target.value });
                        if (createErrors.departureTime) setCreateErrors((prev) => ({ ...prev, departureTime: '' }));
                      }}
                      className={`h-8 bg-background/50 rounded-lg font-mono text-sm ${createErrors.departureTime ? 'border-destructive' : 'border-border/70'
                        }`}
                    />
                    {createErrors.departureTime && (
                      <p className="text-[10px] text-destructive">{createErrors.departureTime}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Arrival</label>
                    <Input
                      required
                      type="datetime-local"
                      value={formData.arrivalTime}
                      onChange={(e) => {
                        setFormData({ ...formData, arrivalTime: e.target.value });
                        if (createErrors.arrivalTime) setCreateErrors((prev) => ({ ...prev, arrivalTime: '' }));
                      }}
                      className={`h-8 bg-background/50 rounded-lg font-mono text-sm ${createErrors.arrivalTime ? 'border-destructive' : 'border-border/70'
                        }`}
                    />
                    {createErrors.arrivalTime && (
                      <p className="text-[10px] text-destructive">{createErrors.arrivalTime}</p>
                    )}
                  </div>

                  <div className="col-span-1 space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Price (₹)</label>
                    <Input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="1200"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        if (createErrors.price) setCreateErrors((prev) => ({ ...prev, price: '' }));
                      }}
                      className={`h-8 bg-background/50 rounded-lg text-sm ${createErrors.price ? 'border-destructive' : 'border-border/70'
                        }`}
                    />
                    {createErrors.price && (
                      <p className="text-[10px] text-destructive">{createErrors.price}</p>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-border/40 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-lg text-sm h-8"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={creating} className="rounded-lg text-sm h-8 px-3">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchServices(true)} className="underline hover:no-underline font-medium">
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search route or service"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-7 h-8 bg-card border-border/60 rounded-lg text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">

          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/30">
            {(['all', 'on-time', 'delayed', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${statusFilter === st
                  ? 'bg-card text-foreground shadow-2xs border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {st === 'all' && `All (${counts.all})`}
                {st === 'on-time' && `On Time (${counts.onTime})`}
                {st === 'delayed' && `Delayed (${counts.delayed})`}
                {st === 'cancelled' && `Cancelled (${counts.cancelled})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredServices.length > 0 && (
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5">Service & Route</div>
          <div className="col-span-3">Timetable</div>
          <div className="col-span-2">Fare</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
      )}

      <div className="space-y-2">
        {paginatedServices.map((service) => {
          const ModeIcon = getTransitIcon(service.type);
          const isCancelled = service.isCancelled;
          const isDelayed = service.isDelayed;
          const isActing = actionLoadingId === service.id;

          const depDate = new Date(service.departureTime);
          const arrDate = new Date(service.arrivalTime);
          const isNextDay = arrDate.getDate() !== depDate.getDate();

          return (
            <div
              key={service.id}
              className={`p-4 sm:px-4 rounded-xl bg-card border border-border/50 transition-all duration-150 hover:border-border/80 hover:shadow-2xs flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 ${isCancelled ? 'opacity-55 bg-muted/10' : ''
                }`}
            >

              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground shrink-0">
                  <ModeIcon className="w-4 h-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {service.serviceNumber}
                    </span>

                    {isCancelled ? (
                      <span className="status-badge badge-destructive">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Cancelled
                      </span>
                    ) : isDelayed ? (
                      <span className="status-badge badge-warning">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Delayed
                      </span>
                    ) : (
                      <span className="status-badge badge-success">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        On Time
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-foreground flex items-center gap-2 font-medium truncate">
                    <span>{service.originStation.city}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({service.originStation.code})</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span>{service.destinationStation.city}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({service.destinationStation.code})</span>
                  </div>
                </div>
              </div>

              <div className="col-span-3 text-sm font-mono text-muted-foreground">
                <div className="text-foreground/90 font-medium flex items-center gap-2">
                  <span>{format(depDate, 'HH:mm')}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span>{format(arrDate, 'HH:mm')}</span>
                  {isNextDay && (
                    <span className="text-[9px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                      +1d
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {format(depDate, 'MMM d, yyyy')}
                </div>
              </div>

              <div className="col-span-2 text-sm font-mono text-muted-foreground">
                <div className="text-foreground/90 font-medium">
                  ₹{Number(service.price).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="col-span-2 flex items-center md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/30">
                {!isCancelled ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() => openDelayDialog(service)}
                      className="rounded-md text-sm h-7 px-2 text-amber-300 bg-amber-500/10 transition-colors"
                    >
                      {isActing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Delay
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isActing}
                      onClick={() => openCancelDialog(service)}
                      className="rounded-md text-sm h-7 px-2 text-destructive bg-destructive/20 hover:bg-destructive/30 transition-colors"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 italic">Cancelled</span>
                )}
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="p-8 rounded-xl bg-card border border-border/40 text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {services.length === 0 ? 'No services published yet.' : 'No services match filters.'}
            </p>
            {services.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-sm h-7"
              >
                Reset filters
              </Button>
            )}
          </div>
        )}

        {filteredServices.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground font-mono">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredServices.length)} of {filteredServices.length} scheduled departures
            </p>

            {totalPages > 1 && (
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    if (totalPages > 6 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                      if (p === 2 || p === totalPages - 1) {
                        return (
                          <PaginationItem key={p}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={delayDialog.isOpen}
        onOpenChange={(open) => setDelayDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Delay Service {delayDialog.service?.serviceNumber}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {delayDialog.service?.originStation.code} → {delayDialog.service?.destinationStation.code} • Scheduled{' '}
              {delayDialog.service && format(new Date(delayDialog.service.arrivalTime), 'HH:mm')}
            </DialogDescription>
          </DialogHeader>

          {delayDialog.service && (
            <div className="space-y-3 my-1">

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium">Delay</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DELAY_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDelayDialog((prev) => ({ ...prev, minutes: p }))}
                      className={`px-2 py-1 rounded text-sm font-mono transition-colors ${delayDialog.minutes === p
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      +{p}m
                    </button>
                  ))}
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="Min"
                    value={delayDialog.minutes || ''}
                    onChange={(e) =>
                      setDelayDialog((prev) => ({
                        ...prev,
                        minutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-16 h-7 bg-background/50 border-border/70 rounded text-sm font-mono ml-auto"
                  />
                </div>
              </div>

              {delayDialog.minutes > 0 && (
                <div className="text-sm text-muted-foreground font-mono flex items-center justify-between py-1 px-2 rounded bg-muted/30">
                  <span>New Arrival:</span>
                  <span className="font-semibold text-foreground">
                    {format(
                      new Date(new Date(delayDialog.service.arrivalTime).getTime() + delayDialog.minutes * 60000),
                      'HH:mm (MMM d)'
                    )}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Reason</label>
                <Select
                  value={delayDialog.reason}
                  onValueChange={(val) => setDelayDialog((prev) => ({ ...prev, reason: val }))}
                >
                  <SelectTrigger className="h-8 bg-background/50 border-border/70 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-sm">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Notes (optional)</label>
                <Input
                  placeholder="e.g. Signal hold..."
                  value={delayDialog.customDescription}
                  onChange={(e) =>
                    setDelayDialog((prev) => ({ ...prev, customDescription: e.target.value }))
                  }
                  className="h-8 bg-background/50 border-border/70 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDelayDialog((prev) => ({ ...prev, isOpen: false }))}
              className="rounded-lg text-sm h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelay}
              disabled={actionLoadingId !== null || delayDialog.minutes <= 0}
              className="rounded-lg text-sm h-8 px-3"
            >
              {actionLoadingId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelDialog.isOpen}
        onOpenChange={(open) => setCancelDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-sm bg-card border-border rounded-xl p-5">
          <DialogHeader>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Cancel Service {cancelDialog.service?.serviceNumber}?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Affected passengers will be alerted and shown re-route options automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 my-1">
            <label className="text-sm text-muted-foreground font-medium">Reason (optional)</label>
            <Input
              placeholder="e.g. Technical fault, weather..."
              value={cancelDialog.reason}
              onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
              className="h-8 bg-background/50 border-border/70 rounded-lg text-sm"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelDialog({ isOpen: false, service: null, reason: '' })}
              className="rounded-lg text-sm h-8"
            >
              Keep Service
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={actionLoadingId !== null}
              onClick={handleConfirmCancel}
              className="rounded-lg text-sm h-8 px-3"
            >
              {actionLoadingId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OperatorDashboard;
