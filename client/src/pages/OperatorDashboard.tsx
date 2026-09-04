import { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import type { Service, Station, ServiceType } from '@/types';
import { Button } from '@/components/ui/button';
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

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Delay Dialog State
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

  // Cancel Dialog State
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({
    isOpen: false,
    service: null,
  });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on-time' | 'delayed' | 'cancelled'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | ServiceType>('all');

  // Form State for creating service
  const [formData, setFormData] = useState({
    type: 'train' as ServiceType,
    serviceNumber: '',
    originStationId: '',
    destinationStationId: '',
    departureTime: '',
    arrivalTime: '',
    price: '',
    seatCapacity: '120',
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

  // Open Delay Dialog
  const openDelayDialog = (service: Service) => {
    setDelayDialog({
      isOpen: true,
      service,
      minutes: 30,
      reason: DELAY_REASONS[0],
      customDescription: '',
    });
  };

  // Submit Delay
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

  // Open Cancel Dialog
  const openCancelDialog = (service: Service) => {
    setCancelDialog({
      isOpen: true,
      service,
    });
  };

  // Submit Cancel
  const handleConfirmCancel = async () => {
    if (!cancelDialog.service) return;
    const { service } = cancelDialog;

    setActionLoadingId(service.id);
    try {
      await api(`/services/${service.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCancelled: true }),
      });

      toast.success(
        `Service ${service.serviceNumber} cancelled`,
        { description: 'Passengers flagged for cascade re-routing.' }
      );

      setCancelDialog({ isOpen: false, service: null });
      await fetchServices(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create Service with complete validation guardrails
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

    const capacityNum = parseInt(formData.seatCapacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      errors.seatCapacity = 'Min 1.';
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
          seatCapacity: capacityNum,
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
        seatCapacity: '120',
      });
      await fetchServices(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create service';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // Filtered Services Computation
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Search filter
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

      // Status filter
      if (statusFilter === 'cancelled' && !service.isCancelled) return false;
      if (statusFilter === 'delayed' && (!service.isDelayed || service.isCancelled)) return false;
      if (statusFilter === 'on-time' && (service.isDelayed || service.isCancelled)) return false;

      // Mode filter
      if (modeFilter !== 'all' && service.type !== modeFilter) return false;

      return true;
    });
  }, [services, searchQuery, statusFilter, modeFilter]);

  // Counts for tabs
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
      {/* Header */}
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
                  {/* Mode */}
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

                  {/* Service Number */}
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

                  {/* Origin */}
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

                  {/* Destination */}
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

                  {/* Departure Time */}
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

                  {/* Arrival Time */}
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

                  {/* Price */}
                  <div className="space-y-1">
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

                  {/* Seat Capacity */}
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground font-medium">Seats</label>
                    <Input
                      required
                      type="number"
                      min="1"
                      placeholder="120"
                      value={formData.seatCapacity}
                      onChange={(e) => {
                        setFormData({ ...formData, seatCapacity: e.target.value });
                        if (createErrors.seatCapacity) setCreateErrors((prev) => ({ ...prev, seatCapacity: '' }));
                      }}
                      className={`h-8 bg-background/50 rounded-lg text-sm ${createErrors.seatCapacity ? 'border-destructive' : 'border-border/70'
                        }`}
                    />
                    {createErrors.seatCapacity && (
                      <p className="text-[10px] text-destructive">{createErrors.seatCapacity}</p>
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

      {/* Global Error */}
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

      {/* Unified Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search route or service #..."
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

        {/* Filters Group */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Filters */}
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

          {/* Mode Filter */}
          <Select value={modeFilter} onValueChange={(val) => setModeFilter(val as 'all' | ServiceType)}>
            <SelectTrigger className="h-8 w-28 bg-card border-border/60 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All Modes</SelectItem>
              <SelectItem value="train" className="text-sm">Trains</SelectItem>
              <SelectItem value="flight" className="text-sm">Flights</SelectItem>
              <SelectItem value="bus" className="text-sm">Buses</SelectItem>
              <SelectItem value="metro" className="text-sm">Metro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Column Headers for Desktop Grid */}
      {filteredServices.length > 0 && (
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5">Service & Route</div>
          <div className="col-span-3">Timetable</div>
          <div className="col-span-2">Capacity & Fare</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-2">
        {filteredServices.map((service) => {
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
              {/* Col 1-5: Service & Route */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground shrink-0">
                  <ModeIcon className="w-4 h-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {service.serviceNumber}
                    </span>

                    {/* Status Pill with dot indicator */}
                    {isCancelled ? (
                      <span className="inline-flex items-center gap-2 text-[10px] font-medium text-destructive px-2 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Cancelled
                      </span>
                    ) : isDelayed ? (
                      <span className="inline-flex items-center gap-2 text-[10px] font-medium text-amber-400 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Delayed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[10px] font-medium text-emerald-400 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        On Time
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-foreground flex items-center gap-2 font-medium truncate">
                    <span>{service.originStation.city}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({service.originStation.code})</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                    <span>{service.destinationStation.city}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({service.destinationStation.code})</span>
                  </div>
                </div>
              </div>

              {/* Col 6-8: Timetable with overnight badge */}
              <div className="col-span-3 text-sm font-mono text-muted-foreground">
                <div className="text-foreground/90 font-medium flex items-center gap-2">
                  <span>{format(depDate, 'HH:mm')}</span>
                  <span className="text-muted-foreground/50">→</span>
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

              {/* Col 9-10: Capacity & Fare */}
              <div className="col-span-2 text-sm font-mono text-muted-foreground">
                <div className="text-foreground/90 font-medium">
                  ₹{Number(service.price).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {service.seatCapacity} seats
                </div>
              </div>

              {/* Col 11-12: Actions */}
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

        {/* Empty state */}
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
                  setModeFilter('all');
                }}
                className="text-sm h-7"
              >
                Reset filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Streamlined Delay Dialog */}
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
              {/* Presets and duration input */}
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

              {/* Calculated Arrival */}
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

              {/* Reason */}
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

              {/* Optional Notes */}
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

      {/* Streamlined Cancel Dialog */}
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
              This triggers automatic cascade re-routing or refund options for all booked passengers.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelDialog({ isOpen: false, service: null })}
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
