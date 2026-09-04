import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/services/api';
import type { Operator } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, UserPlus, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const operatorSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type OperatorFormValues = z.infer<typeof operatorSchema>;

export function OperatorManagement() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const form = useForm<OperatorFormValues>({
    resolver: zodResolver(operatorSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const fetchOperators = (showLoading = false) => {
    if (showLoading) setLoading(true);
    api('/admin/operators')
      .then((data: Operator[]) => {
        setOperators(data || []);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || 'Failed to load operators');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    api('/admin/operators')
      .then((data: Operator[]) => {
        if (!isMounted) return;
        setOperators(data || []);
      })
      .catch((err: { message?: string }) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load operators');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values: OperatorFormValues) => {
    try {
      await api('/admin/operators', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset({ name: '', email: '', password: '' });
      fetchOperators();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to onboard operator';
      alert(msg);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Are you sure you want to suspend this operator? Their services will be deactivated.')) return;
    try {
      await api(`/admin/operators/${id}/suspend`, { method: 'POST' });
      fetchOperators();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to suspend operator';
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Operator Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard, authenticate, and manage transit operators and fleet providers.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Onboard New Operator</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Operator / Carrier Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="IndiGo Airlines / Northern Railway" className="h-10 bg-background/60 border-border/80 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Official Email
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ops@indigo.in" className="h-10 bg-background/60 border-border/80 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Initial Password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="h-10 bg-background/60 border-border/80 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full rounded-xl font-bold shadow-lg shadow-primary/20"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Onboarding...
                  </>
                ) : (
                  'Grant Access'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Active Operators</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            Total: {operators.length}
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
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground">Company Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground">Email</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground">Registered Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op) => {
                  const isActive = op.isActive !== false;
                  return (
                    <TableRow key={op.id} className={`border-border/40 hover:bg-accent/20 ${!isActive ? 'opacity-50' : ''}`}>
                      <TableCell className="font-bold text-foreground">{op.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{op.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md ${isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {op.createdAt ? format(new Date(op.createdAt), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleSuspend(op.id)}
                            className="rounded-lg text-xs font-bold h-8"
                          >
                            <ShieldAlert className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorManagement;
