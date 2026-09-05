import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plane, TrainFront, Bus, TramFront, Footprints, ShieldCheck, ArrowRight, Loader2, Shield, Building2, User, Sparkles } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const [error, setError] = useState('');
  const { setToken, role } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (role === 'traveler') navigate('/search');
    if (role === 'operator') navigate('/operator');
    if (role === 'admin') navigate('/admin');
  }, [role, navigate]);

  const fillCredentials = (email: string, pass: string) => {
    form.setValue('email', email, { shouldValidate: true });
    form.setValue('password', pass, { shouldValidate: true });
    setError('');
  };

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setError('');
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setToken(data.token);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Failed to login. Please verify your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground relative overflow-hidden">
      <div className="lg:w-1/2 relative flex flex-col justify-between p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-border/40 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Footprints className="h-6 w-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-primary">
                Waypoint
              </span>
              <span className="block text-sm font-mono uppercase tracking-widest text-muted-foreground mt-1">
                A Multi-Modal Travel Itinerary Management System
              </span>
            </div>
          </div>

          <div className="space-y-4 max-w-lg mt-10">
            <h1 className="text-4xl lg:text-5xl font-black leading-tight mt-4">
              India's multi-modal travel planner.
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
              Seamlessly unify Indian Railways, domestic flights, state buses, city metros, and walking legs into a single, high-precision itinerary.
            </p>
          </div>
        </div>


        <div className="p-6 m-4 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-2 text-sky-400"><Plane className="w-4 h-4" /> Flights</span>
            <span className="flex items-center gap-2 text-violet-400"><TrainFront className="w-4 h-4" /> Railways</span>
            <span className="flex items-center gap-2 text-amber-400"><Bus className="w-4 h-4" /> Express Bus</span>
            <span className="flex items-center gap-2 text-emerald-400"><TramFront className="w-4 h-4" /> Metro</span>
            <span className="flex items-center gap-2 text-slate-400"><Footprints className="w-4 h-4" /> Walk</span>
          </div>
        </div>


        <div className="relative z-10 flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time disruption monitor & automated itinerary updates</span>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Sign in to Waypoint</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email and password to access your dashboard.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            {/* Quick Demo Autofill */}
            <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-2 uppercase tracking-wider font-semibold">
                  <Sparkles className="w-4 h-4 text-primary" /> Demo Logins
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('admin@waypoint.in', 'Password123!')}
                  className="h-8 text-xs font-medium border-border/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Shield className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Admin</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('ops@indigo.in', 'Password123!')}
                  className="h-8 text-xs font-medium border-border/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ops</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('aarav@email.com', 'Password123!')}
                  className="h-8 text-xs font-medium border-border/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <User className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>User</span>
                </Button>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          type="email"
                          autoComplete="email"
                          className="h-11 bg-background/60 border-border/80 rounded-xl focus:border-primary"
                          {...field}
                        />
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
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="h-11 bg-background/60 border-border/80 rounded-xl focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 mt-2"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="pt-4 border-t border-border/40 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
