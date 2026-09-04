import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/services/api';
import type { Station } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Loader2, ArrowLeft, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stationSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be max 10 characters'),
  name: z.string().min(2, 'Name is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
});

type StationFormValues = z.infer<typeof stationSchema>;

export function StationManagement() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: { code: '', name: '', city: '', latitude: 0, longitude: 0 },
  });

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
      fetchStations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create station';
      alert(msg);
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
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Plus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Add New Station</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Code (e.g. DEL / BOM)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="NDLS" className="h-10 bg-background/60 border-border/80 rounded-xl font-mono uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Station / Airport Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="New Delhi Railway Station" className="h-10 bg-background/60 border-border/80 rounded-xl" {...field} />
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
                    <Input placeholder="New Delhi" className="h-10 bg-background/60 border-border/80 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Latitude
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="28.6139" className="h-10 bg-background/60 border-border/80 rounded-xl font-mono" {...field} />
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
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Longitude
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="77.2090" className="h-10 bg-background/60 border-border/80 rounded-xl font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sm:col-span-2 lg:col-span-5 flex justify-end pt-2">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="rounded-xl font-bold shadow-lg shadow-primary/20 px-6"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Station...
                  </>
                ) : (
                  'Register Station'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Registered Network Stations</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            Total: {stations.length}
          </span>
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
                {stations.map((s) => (
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
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-card border border-border/60 font-mono text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3 text-primary" />
                        {s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StationManagement;
