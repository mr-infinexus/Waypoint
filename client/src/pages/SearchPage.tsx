import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { api } from '@/services/api';
import type { Station, SortHeuristic } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Compass,
  ArrowRight,
  ArrowUpDown,
  Sparkles,
  Zap,
  Shuffle,
  Banknote,
  Plane,
  TrainFront,
  Bus,
  TramFront,
  Calendar,
  Search,
  X,
  MapPin,
  Loader2,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getStationIcon(station: Station) {
  const code = station.code.toUpperCase();
  const name = station.name.toLowerCase();

  if (code.length === 3 || name.includes('airport') || name.includes('intl')) return Plane;
  if (name.includes('metro')) return TramFront;
  if (name.includes('bus') || name.includes('isbt')) return Bus;
  return TrainFront;
}

function MapController({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds(
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
    } else if (origin) {
      map.flyTo([origin.lat, origin.lng], 8, { duration: 1 });
    } else if (destination) {
      map.flyTo([destination.lat, destination.lng], 8, { duration: 1 });
    }
  }, [origin, destination, map]);

  return null;
}

function StationDropdown({
  isOpen,
  onClose,
  suggestions,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestions: Station[];
  onSelect: (s: Station) => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg bg-card border border-border shadow-xl z-40 p-1 divide-y divide-border/30">
        {suggestions.length > 0 ? (
          suggestions.map((s) => {
            const Icon = getStationIcon(s);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/70 flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-muted text-muted-foreground shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.city}</p>
                  </div>
                </div>
                <span className="font-mono font-semibold text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded ml-2">
                  {s.code}
                </span>
              </button>
            );
          })
        ) : (
          <div className="p-3 text-xs text-muted-foreground text-center">
            No matching stations found
          </div>
        )}
      </div>
    </>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);

  // Selected station states
  const [originStation, setOriginStation] = useState<Station | null>(null);
  const [destStation, setDestStation] = useState<Station | null>(null);

  // Search input queries
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');

  // Dropdown open states
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);

  // Raw coordinates for route calculation
  const origin = useMemo(() => {
    if (originStation && originStation.latitude !== null && originStation.longitude !== null) {
      return { lat: originStation.latitude, lng: originStation.longitude };
    }
    return null;
  }, [originStation]);

  const destination = useMemo(() => {
    if (destStation && destStation.latitude !== null && destStation.longitude !== null) {
      return { lat: destStation.latitude, lng: destStation.longitude };
    }
    return null;
  }, [destStation]);

  const [date, setDate] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [sortBy, setSortBy] = useState<SortHeuristic>('cheapest');

  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoadingStations(true);
    api('/stations')
      .then((data: Station[]) => {
        setStations(data || []);
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch stations', err);
      })
      .finally(() => {
        setLoadingStations(false);
      });
  }, []);

  // Filtered station suggestions
  const originSuggestions = useMemo(() => {
    if (!originQuery.trim()) return stations.slice(0, 8);
    const q = originQuery.toLowerCase().trim();
    return stations.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [stations, originQuery]);

  const destSuggestions = useMemo(() => {
    if (!destQuery.trim()) return stations.slice(0, 8);
    const q = destQuery.toLowerCase().trim();
    return stations.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [stations, destQuery]);

  // Select origin
  const handleSelectOrigin = (station: Station) => {
    setOriginStation(station);
    setOriginQuery(`${station.code} • ${station.city}`);
    setOriginFocused(false);
    if (!destStation) {
      destInputRef.current?.focus();
      setDestFocused(true);
    }
  };

  // Select destination
  const handleSelectDest = (station: Station) => {
    setDestStation(station);
    setDestQuery(`${station.code} • ${station.city}`);
    setDestFocused(false);
  };

  // Swap Origin & Destination
  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 250);

    const tempStation = originStation;
    const tempQuery = originQuery;

    setOriginStation(destStation);
    setOriginQuery(destQuery);

    setDestStation(tempStation);
    setDestQuery(tempQuery);
  };

  // Calculate straight-line distance
  const straightLineDistance = useMemo(() => {
    if (!origin || !destination) return null;
    return Number(haversineDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng).toFixed(1));
  }, [origin, destination]);

  const isSearchReady = Boolean(origin && destination && date);

  const handleSearch = () => {
    if (!origin || !destination || !date) return;
    const isoDate = new Date(`${date}T00:00:00.000Z`).toISOString();
    const params = new URLSearchParams({
      originLat: origin.lat.toString(),
      originLng: origin.lng.toString(),
      destinationLat: destination.lat.toString(),
      destinationLng: destination.lng.toString(),
      date: isoDate,
      sortBy,
    });
    navigate(`/results?${params.toString()}`);
  };

  const sortOptions: { id: SortHeuristic; label: string; icon: typeof Banknote }[] = [
    { id: 'cheapest', label: 'Cheapest', icon: Banknote },
    { id: 'fastest', label: 'Fastest', icon: Zap },
    { id: 'transfers', label: 'Fewest Changes', icon: Shuffle },
  ];

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden relative bg-background">
      {/* Sidebar Control Panel */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col justify-between p-5 sm:p-6 bg-card border-r border-border/60 overflow-y-auto shrink-0 z-20 space-y-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Compass className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Journey Planner</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Air, rail, metro, and road multi-modal connections
            </p>
          </div>

          {/* Unified Routing Card */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-3 relative">
            {/* Origin Input */}
            <div className="space-y-1 relative">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Origin Station / City
              </label>
              <div className="relative">
                {loadingStations ? (
                  <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  ref={originInputRef}
                  placeholder={loadingStations ? 'Loading stations...' : 'City, station, or code (e.g. BOM)...'}
                  value={originQuery}
                  onChange={(e) => {
                    setOriginQuery(e.target.value);
                    if (originStation) setOriginStation(null);
                  }}
                  onFocus={() => {
                    setOriginFocused(true);
                    setDestFocused(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOriginFocused(false);
                  }}
                  className="pl-8 pr-7 h-9 bg-card border-border/70 rounded-lg text-xs"
                />
                {originQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setOriginQuery('');
                      setOriginStation(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <StationDropdown
                isOpen={originFocused}
                onClose={() => setOriginFocused(false)}
                suggestions={originSuggestions}
                onSelect={handleSelectOrigin}
              />
            </div>

            {/* Central Swap Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <button
                type="button"
                onClick={handleSwap}
                disabled={!originStation && !destStation}
                className={`relative z-10 p-1 rounded-full bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 disabled:opacity-40 ${isSwapping ? '-rotate-180' : 'rotate-0'
                  }`}
                title="Swap Origin and Destination"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Input */}
            <div className="space-y-1 relative">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Destination Station / City
              </label>
              <div className="relative">
                {loadingStations ? (
                  <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  ref={destInputRef}
                  placeholder={loadingStations ? 'Loading stations...' : 'City, station, or code (e.g. DEL)...'}
                  value={destQuery}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    if (destStation) setDestStation(null);
                  }}
                  onFocus={() => {
                    setDestFocused(true);
                    setOriginFocused(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setDestFocused(false);
                  }}
                  className="pl-8 pr-7 h-9 bg-card border-border/70 rounded-lg text-xs"
                />
                {destQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setDestQuery('');
                      setDestStation(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <StationDropdown
                isOpen={destFocused}
                onClose={() => setDestFocused(false)}
                suggestions={destSuggestions}
                onSelect={handleSelectDest}
              />
            </div>
          </div>

          {/* Date & Heuristic Parameters */}
          <div className="space-y-3">
            {/* Travel Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Departure Date
              </label>
              <Input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 bg-card border-border/70 rounded-lg text-xs font-mono"
              />
            </div>

            {/* Sort Heuristic */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSortBy(opt.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${isSelected
                        ? 'bg-muted text-foreground font-medium border-border shadow-2xs'
                        : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Search CTA */}
        <div className="pt-3 border-t border-border/40 space-y-2">
          {straightLineDistance !== null && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Displacement:
              </span>
              <span className="font-mono font-medium text-foreground">
                {straightLineDistance.toLocaleString()} km
              </span>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleSearch}
            disabled={!isSearchReady}
            className="w-full h-10 rounded-lg font-medium text-xs shadow-sm transition-all"
          >
            <span>Search Multi-Modal Routes</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {!isSearchReady && (
            <p className="text-[11px] text-center text-muted-foreground">
              {!originStation
                ? 'Select origin station'
                : !destStation
                  ? 'Select destination station'
                  : 'Choose travel date'}
            </p>
          )}
        </div>
      </div>

      {/* Map Route Preview Canvas */}
      <div className="flex-1 h-[400px] lg:h-full relative overflow-hidden">
        {/* Active Route Overview Badge */}
        {originStation && destStation && (
          <div className="absolute top-3 right-3 z-400 bg-card/90 backdrop-blur-md border border-border/60 px-3 py-2 rounded-lg shadow-xs text-xs font-mono flex items-center gap-2 pointer-events-auto">
            <span className="text-emerald-400 font-semibold">{originStation.code}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-rose-400 font-semibold">{destStation.code}</span>
            {straightLineDistance !== null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground font-medium">{straightLineDistance} km</span>
              </>
            )}
          </div>
        )}

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

          <MapController origin={origin} destination={destination} />

          {stations.map((station) => {
            if (station.latitude === null || station.longitude === null) return null;
            const isOrigin = originStation?.id === station.id;
            const isDest = destStation?.id === station.id;

            return (
              <CircleMarker
                key={station.id}
                center={[station.latitude, station.longitude]}
                radius={isOrigin || isDest ? 6 : 4}
                pathOptions={{
                  color: isOrigin ? '#10b981' : isDest ? '#f43f5e' : 'oklch(0.729 0.1306 86.6)',
                  fillColor: isOrigin ? '#10b981' : isDest ? '#f43f5e' : 'oklch(0.729 0.1306 86.6)',
                  fillOpacity: isOrigin || isDest ? 1 : 0.75,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (!originStation) {
                      handleSelectOrigin(station);
                    } else {
                      handleSelectDest(station);
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                  <div className="text-xs font-sans">
                    <span className="font-bold">{station.name}</span>{' '}
                    <span className="font-mono text-muted-foreground">({station.code})</span>
                    <div className="text-[10px] text-muted-foreground">{station.city}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {origin && (
            <CircleMarker
              center={[origin.lat, origin.lng]}
              radius={7}
              pathOptions={{
                color: '#000000',
                fillColor: '#10b981',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]} opacity={0.95}>
                <span className="font-semibold text-xs">Origin</span>
              </Tooltip>
            </CircleMarker>
          )}
          {destination && (
            <CircleMarker
              center={[destination.lat, destination.lng]}
              radius={7}
              pathOptions={{
                color: '#000000',
                fillColor: '#f43f5e',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]} opacity={0.95}>
                <span className="font-semibold text-xs">Destination</span>
              </Tooltip>
            </CircleMarker>
          )}

          {origin && destination && (
            <Polyline
              positions={[
                [origin.lat, origin.lng],
                [destination.lat, destination.lng],
              ]}
              pathOptions={{
                color: 'oklch(0.729 0.1306 86.6)',
                weight: 3,
                dashArray: '6, 8',
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default SearchPage;
