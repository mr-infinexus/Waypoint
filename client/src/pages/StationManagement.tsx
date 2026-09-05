import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/services/api';
import type { Station } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Loader2, ArrowLeft, Building, Search, Crosshair } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const stationSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be max 10 characters'),
  name: z.string().min(2, 'Name is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
});

interface StationFormValues {
  code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

const selectedMarkerIcon = L.divIcon({
  className: 'custom-selected-station-pin',
  html: `<div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: none;">
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 34px; height: 34px; background: rgba(59, 130, 246, 0.35); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 30px; height: 30px; border-radius: 9999px; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); border: 2px solid #ffffff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
    <div style="width: 7px; height: 7px; background: #2563eb; transform: rotate(45deg); margin-top: -4px; border-bottom: 2px solid white; border-right: 2px solid white;"></div>
  </div>`,
  iconSize: [0, 0],
});

function MapClickPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      onSelect(lat, lng);
    },
  });
  return null;
}

function MapViewController({
  focus,
}: {
  focus: { target: [number, number]; zoom?: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focus && !isNaN(focus.target[0]) && !isNaN(focus.target[1])) {
      map.flyTo(focus.target, focus.zoom ?? Math.max(map.getZoom(), 12), { duration: 1.2 });
    }
  }, [focus, map]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const quickCities = [
  { name: 'All India', coords: [20.5937, 78.9629] as [number, number], zoom: 5 },
  { name: 'Delhi', coords: [28.6139, 77.209] as [number, number], zoom: 11 },
  { name: 'Mumbai', coords: [19.076, 72.8777] as [number, number], zoom: 11 },
  { name: 'Bengaluru', coords: [12.9716, 77.5946] as [number, number], zoom: 11 },
  { name: 'Chennai', coords: [13.0827, 80.2707] as [number, number], zoom: 11 },
  { name: 'Kolkata', coords: [22.5726, 88.3639] as [number, number], zoom: 11 },
];

export function StationManagement() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [mapFocus, setMapFocus] = useState<{ target: [number, number]; zoom?: number } | null>(null);
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 8;

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: { code: '', name: '', city: '', latitude: 0, longitude: 0 },
  });

  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');

  const selectedCoords: [number, number] | null = useMemo(() => {
    const lat = typeof watchedLat === 'number' ? watchedLat : parseFloat(String(watchedLat));
    const lng = typeof watchedLng === 'number' ? watchedLng : parseFloat(String(watchedLng));
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }
    return null;
  }, [watchedLat, watchedLng]);

  const handleCoordinatesSelected = (lat: number, lng: number) => {
    form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
    form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
    setMapFocus({ target: [lat, lng] });
  };

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    });
  }, [stations, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStations.length / ITEMS_PER_PAGE));
  const paginatedStations = filteredStations.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const fetchStations = (showLoading = false) => {
    if (showLoading) setLoading(true);
    api('/stations')
      .then((data: Station[]) => {
        setStations(data || []);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || 'Failed to load stations');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    api('/stations')
      .then((data: Station[]) => {
        if (!isMounted) return;
        setStations(data || []);
      })
      .catch((err: { message?: string }) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load stations');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values: StationFormValues) => {
    try {
      await api('/admin/stations', {
        method: 'POST',
        body: JSON.stringify({
          code: values.code.toUpperCase().trim(),
          name: values.name.trim(),
          city: values.city.trim(),
          latitude: values.latitude,
          longitude: values.longitude,
        }),
      });
      form.reset({ code: '', name: '', city: '', latitude: 0, longitude: 0 });
      toast.success(`Station ${values.code.toUpperCase()} registered successfully`);
      fetchStations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create station';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/admin')}
          className="rounded-xl h-10 w-10 border-border/80 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Station Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add transit hubs with precise GPS coordinates for multi-modal walk routing.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">Add New Station</h2>
              <p className="text-xs text-muted-foreground">Click the interactive map to pin exact station GPS coordinates</p>
            </div>
          </div>
          {selectedCoords && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-xs font-mono text-primary">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedCoords[0]}, {selectedCoords[1]}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Code
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="NDLS / DEL"
                            className="h-10 bg-background/60 border-border/80 rounded-xl font-mono uppercase"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="New Delhi"
                            className="h-10 bg-background/60 border-border/80 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Station / Hub Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="New Delhi Central Railway Station"
                          className="h-10 bg-background/60 border-border/80 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Latitude</span>
                          <span className="text-[10px] text-primary/80 font-normal">Map linked</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="28.6139"
                            className="h-10 bg-background/60 border-border/80 rounded-xl font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Longitude</span>
                          <span className="text-[10px] text-primary/80 font-normal">Map linked</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="77.2090"
                            className="h-10 bg-background/60 border-border/80 rounded-xl font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all duration-200"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering Hub...
                    </>
                  ) : (
                    'Register Station'
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Crosshair className="w-3.5 h-3.5 text-primary" />
                <span>Click map to place pin, or drag marker</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {quickCities.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => setMapFocus({ target: city.coords, zoom: city.zoom })}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-background/60 hover:bg-accent border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {city.name}
                  </button>
                ))}

              </div>
            </div>

            <div className="h-[360px] w-full rounded-2xl border border-border/70 overflow-hidden relative shadow-inner">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapResizeHandler />
                <MapClickPicker onSelect={handleCoordinatesSelected} />
                <MapViewController focus={mapFocus} />

                {stations.map((s) => {
                  if (s.latitude === null || s.longitude === null) return null;
                  return (
                    <CircleMarker
                      key={s.id}
                      center={[s.latitude, s.longitude]}
                      radius={5}
                      pathOptions={{
                        color: '#64748b',
                        fillColor: '#3b82f6',
                        fillOpacity: 0.8,
                        weight: 1.5,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]}>
                        <div className="text-xs font-sans">
                          <div className="font-bold">{s.name}</div>
                          <div className="font-mono text-muted-foreground">{s.code} · {s.city}</div>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {selectedCoords && (
                  <Marker
                    position={selectedCoords}
                    icon={selectedMarkerIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend(e) {
                        const marker = e.target;
                        const latlng = marker.getLatLng();
                        const lat = parseFloat(latlng.lat.toFixed(6));
                        const lng = parseFloat(latlng.lng.toFixed(6));
                        form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
                        form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
                      },
                    }}
                  >
                    <Popup className="font-sans text-xs">
                      <div className="p-1 space-y-1">
                        <div className="font-bold text-foreground">Selected Position</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {selectedCoords[0]}, {selectedCoords[1]}
                        </div>
                        <div className="text-[10px] text-primary">Drag marker to adjust location</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Registered Network Stations</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Filter by code, name, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-9 bg-background/60 border-border/70 rounded-xl text-xs"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Code</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">City</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Latitude</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground">Longitude</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right">Coordinates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStations.map((s) => (
                    <TableRow key={s.id} className="border-border/40 hover:bg-accent/20">
                      <TableCell className="font-mono font-black text-primary">{s.code}</TableCell>
                      <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.city}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {s.latitude !== null && s.latitude !== undefined ? s.latitude : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {s.longitude !== null && s.longitude !== undefined ? s.longitude : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (s.latitude !== null && s.longitude !== null && s.latitude !== undefined && s.longitude !== undefined) {
                              setMapFocus({ target: [s.latitude, s.longitude], zoom: 14 });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card border border-border/60 font-mono text-[11px] text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                          title="Click to view on map"
                        >
                          <MapPin className="w-3 h-3 text-primary" />
                          {s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : '—'}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground font-mono">
                Showing {filteredStations.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredStations.length)} of {filteredStations.length} stations
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
          </div>
        )}
      </div>
    </div>
  );
}

export default StationManagement;
