import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { AdminStats } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  TrainFront,
  Activity,
  AlertTriangle,
  MapPin,
  Users,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function AnimatedCounter({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count}</span>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/admin/stats')
      .then((data: AdminStats) => {
        setStats(data);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || 'Failed to fetch administrative metrics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Aggregating nationwide network statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <p className="text-base font-bold text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Administration</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time health telemetry, operator onboarding, and nationwide waypoint management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card-glass space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Operators
            </span>
            <div className="p-3 rounded-xl bg-primary/15 text-primary">
              <TrainFront className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-foreground">
            <AnimatedCounter end={stats?.totalOperators || 0} />
          </div>
          <p className="text-xs text-muted-foreground">
            Verified rail, air, metro, and road transit partners
          </p>
        </div>

        <div className="card-glass space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Itineraries
            </span>
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-emerald-400">
            <AnimatedCounter end={stats?.activeItineraries || 0} />
          </div>
          <p className="text-xs text-muted-foreground">
            Passenger journeys currently scheduled on-time
          </p>
        </div>

        <div className="card-glass space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Disrupted Itineraries
            </span>
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-amber-400">
            <AnimatedCounter end={stats?.disruptedItineraries || 0} />
          </div>
          <p className="text-xs text-muted-foreground">
            Journeys requiring passenger re-routing or notifications
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
          Quick Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/admin/stations')}
            className="card-glass hover:border-primary/50 transition-all duration-200 cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/15 text-primary group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Station Directory</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure transit hubs, coordinates, and city codes
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-primary group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div
            onClick={() => navigate('/admin/operators')}
            className="card-glass hover:border-primary/50 transition-all duration-200 cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/15 text-amber-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Operator Fleet Access</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Onboard service providers, credentials, and access suspension
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-primary group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
