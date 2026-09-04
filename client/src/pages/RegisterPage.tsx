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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Footprints, Compass, Building2, User, ArrowRight, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['traveler', 'operator']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [error, setError] = useState('');
  const { setToken, role: currentRole } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', role: 'traveler' },
  });

  useEffect(() => {
    if (currentRole === 'traveler') navigate('/search');
    if (currentRole === 'operator') navigate('/operator');
    if (currentRole === 'admin') navigate('/admin');
  }, [currentRole, navigate]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setError('');
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setToken(data.token);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Failed to create account. Please try again.');
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

          <div className="space-y-4 max-w-lg mt-8">
            <h1 className="text-4xl lg:text-5xl font-black leading-tight">
              Begin your connected journey.
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
              Create a traveler account to book seamless journeys across India, or register as a transit operator to publish routes and broadcast service status.
            </p>
          </div>
        </div>

        <div className="my-10 relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm">For Travelers</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Find the fastest, cheapest, or fewest-transfer combinations with walk transfer sync and live QR ticketing.
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm">For Operators</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Manage scheduled train, flight, or bus routes with automated delay and cancellation broadcasts.
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-muted-foreground">
          <User className="w-4 h-4 text-primary" />
          <span>One unified account for nationwide multi-modal travel</span>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
              <p className="text-sm text-muted-foreground">
                Join Waypoint to plan or manage multi-modal travel.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Arjun Sharma"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="arjun@example.com"
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
                          autoComplete="new-password"
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Account Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background/60 border-border/80 rounded-xl focus:border-primary">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border/80 rounded-xl">
                          <SelectItem value="traveler">Traveler</SelectItem>
                          <SelectItem value="operator">Transit Operator</SelectItem>
                        </SelectContent>
                      </Select>
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="pt-4 border-t border-border/40 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
