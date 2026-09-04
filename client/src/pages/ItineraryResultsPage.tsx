import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { SearchResultPath, SortHeuristic } from '@/types';
import { JourneyTimeline } from '@/components/JourneyTimeline';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Banknote,
  Clock,
  Shuffle,
  Loader2,
  AlertCircle,
  Calendar,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

const formatDisplayDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function ItineraryResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const originLat = searchParams.get('originLat');
  const originLng = searchParams.get('originLng');
  const destinationLat = searchParams.get('destinationLat');
  const destinationLng = searchParams.get('destinationLng');
  const date = searchParams.get('date');
  const sortBy = (searchParams.get('sortBy') as SortHeuristic) || 'cheapest';

  const isValidQuery = Boolean(originLat && originLng && destinationLat && destinationLng && date);

  const [results, setResults] = useState<SearchResultPath[]>([]);
  const [loading, setLoading] = useState(isValidQuery);
  const [error, setError] = useState(isValidQuery ? '' : 'Missing search coordinates or date. Please start a new search.');

  useEffect(() => {
    if (!isValidQuery) return;
    let isMounted = true;

    const query = new URLSearchParams({
      originLat: originLat!,
      originLng: originLng!,
      destinationLat: destinationLat!,
      destinationLng: destinationLng!,
      date: date!,
      sortBy,
    });

    api(`/search?${query.toString()}`)
      .then((data: SearchResultPath[]) => {
        if (!isMounted) return;
        setResults(data || []);
      })
      .catch((err: { message?: string }) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to compute routes between selected coordinates.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [originLat, originLng, destinationLat, destinationLng, date, sortBy, isValidQuery]);

  const handleSortChange = (newSort: SortHeuristic) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sortBy', newSort);
    setSearchParams(nextParams);
  };

  const corridorInfo = useMemo(() => {
    if (!results || results.length === 0) return null;
    const firstServices = results[0]?.services;
    if (!firstServices || firstServices.length === 0) return null;

    const origin = firstServices[0]?.originStation;
    const dest = firstServices[firstServices.length - 1]?.destinationStation;

    const originName = origin?.city || origin?.name;
    const destName = dest?.city || dest?.name;

    if (originName && destName) {
      return {
        title: `${originName} to ${destName}`,
        codes: `${origin?.code || 'STN'} → ${dest?.code || 'STN'}`,
      };
    }
    return null;
  }, [results]);

  const sortTabs: { id: SortHeuristic; label: string; icon: typeof Banknote }[] = [
    { id: 'cheapest', label: 'Cheapest', icon: Banknote },
    { id: 'fastest', label: 'Fastest', icon: Zap },
    { id: 'transfers', label: 'Fewest Transfers', icon: Shuffle },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/search')}
            className="rounded-lg h-9 w-9 border-border/80 shrink-0"
            title="Back to search"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {corridorInfo?.title || 'Available Routes'}
              </h1>
              {corridorInfo?.codes && (
                <span className="hidden sm:inline-flex items-center font-mono font-medium text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/50">
                  {corridorInfo.codes}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : 'Selected Date'}
              </span>
              <span>•</span>
              <span>Multi-modal connections</span>
            </p>
          </div>
        </div>

        <div className="flex items-center bg-muted/30 border border-border/60 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {sortTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = sortBy === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSortChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${isSelected
                  ? 'bg-card text-foreground font-semibold border border-border/70 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[360px] space-y-4 rounded-2xl bg-card border border-border/60 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Computing Multi-Modal Connections</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Evaluating nationwide flight, train, bus, metro schedules and transfer layovers...
            </p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[320px] space-y-4 rounded-2xl bg-destructive/5 border border-destructive/20 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-destructive">Route Computation Failed</h3>
            <p className="text-xs text-muted-foreground max-w-md">{error}</p>
          </div>
          <Button onClick={() => navigate('/search')} variant="outline" className="rounded-lg mt-2 text-xs">
            Return to Search
          </Button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[320px] space-y-4 rounded-2xl bg-card border border-border/60 p-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Shuffle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">No Connecting Routes Found</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              No matching transit schedules found between the selected hubs on this date. Try choosing another date or origin/destination station.
            </p>
          </div>
          <Button onClick={() => navigate('/search')} className="rounded-lg text-xs">
            Modify Search
          </Button>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            Showing {results.length} recommended {results.length === 1 ? 'itinerary' : 'itineraries'}
          </div>

          <div className="grid gap-4 min-w-0 max-w-full">
            {results.map((path, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/50 shadow-xs hover:border-border/80 transition-all duration-150 space-y-4 min-w-0 max-w-full overflow-hidden"
              >
                
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/30 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                      <span>₹{path.totalPrice.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/40">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDisplayDuration(path.totalDisplayDurationMs)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/25 px-2 py-1 rounded-md border border-border/40">
                      <Shuffle className="w-4 h-4" />
                      <span>{path.transfers === 0 ? 'Direct' : `${path.transfers} Transfer${path.transfers > 1 ? 's' : ''}`}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full min-w-0 max-w-full overflow-x-auto custom-scrollbar overscroll-x-contain py-1">
                  <JourneyTimeline
                    services={path.services}
                    originWalk={path.originWalk}
                    destinationWalk={path.destinationWalk}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-3 pt-3 border-t border-border/40">
                  <Button
                    onClick={() => navigate('/book', { state: { path } })}
                    className="h-9 px-4 rounded-lg font-medium text-xs shadow-xs"
                  >
                    <span>Select & Book Itinerary</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ItineraryResultsPage;
