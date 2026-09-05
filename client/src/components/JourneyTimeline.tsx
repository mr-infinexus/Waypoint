/** Multi-modal horizontal journey timeline visualization */

import type { ElementType } from 'react';
import { Plane, TrainFront, Bus, TramFront, Footprints, Clock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Service, WalkLeg, ServiceType, Station } from '@/types';

export interface JourneyTimelineProps {
  services: Service[];
  originWalk?: WalkLeg | null;
  destinationWalk?: WalkLeg | null;
  className?: string;
}

const MODE_CONFIG: Record<ServiceType, { icon: ElementType; color: string; line: string; label: string }> = {
  flight: { icon: Plane, color: 'text-sky-400', line: 'border-sky-500/30', label: 'Flight' },
  train: { icon: TrainFront, color: 'text-violet-400', line: 'border-violet-500/30', label: 'Train' },
  bus: { icon: Bus, color: 'text-amber-400', line: 'border-amber-500/30', label: 'Bus' },
  metro: { icon: TramFront, color: 'text-emerald-400', line: 'border-emerald-500/30', label: 'Metro' },
  walk: { icon: Footprints, color: 'text-muted-foreground', line: 'border-border/60', label: 'Walk' },
};

const walkBadgeClass = 'flex flex-col items-center bg-muted/30 border border-dashed border-border/60 rounded-lg px-3 py-2 text-muted-foreground shrink-0 whitespace-nowrap min-w-[100px]';
const stationNodeClass = 'flex flex-col items-center shrink-0 min-w-[76px] px-1 text-center';

const formatDurationMs = (diffMs: number) => {
  const totalMins = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatWalkDistance = (distanceKm: number) => {
  if (!distanceKm || isNaN(distanceKm)) return '0 km';
  if (distanceKm < 0.1) return '< 0.1 km';
  return `${Number(distanceKm.toFixed(1))} km`;
};

function WalkBadge({ walk }: { walk: WalkLeg }) {
  return (
    <div className={walkBadgeClass}>
      <div className="flex items-center gap-2 text-xs font-medium text-foreground whitespace-nowrap">
        <Footprints className="w-4 h-4 text-muted-foreground shrink-0" />
        <span>Walk {formatWalkDistance(walk.distanceKm)}</span>
      </div>
      <span className="text-xs text-muted-foreground font-mono mt-1 whitespace-nowrap">
        ~{Math.round(walk.durationMinutes)} min
      </span>
    </div>
  );
}

function StationNode({ time, station }: { time: string; station?: Station | null }) {
  return (
    <div className={stationNodeClass}>
      <span className="text-xs font-mono font-medium text-muted-foreground mb-1 whitespace-nowrap">
        {format(new Date(time), 'HH:mm')}
      </span>
      <div className="h-6 px-3 rounded-md bg-muted/80 border border-border/70 text-foreground font-mono font-semibold text-xs flex items-center justify-center shadow-2xs whitespace-nowrap">
        {station?.code || 'STN'}
      </div>
      <span className="text-xs font-medium text-muted-foreground mt-1 whitespace-nowrap">
        {station?.city || ''}
      </span>
    </div>
  );
}

export function JourneyTimeline({
  services,
  originWalk,
  destinationWalk,
  className,
}: JourneyTimelineProps) {
  if (!services || services.length === 0) return null;

  const firstService = services[0];
  const lastService = services[services.length - 1];

  return (
    <div className={cn("w-full min-w-0 max-w-full overflow-x-auto pb-3 pt-1 custom-scrollbar overscroll-x-contain", className)}>
      <div className="flex items-center min-w-max gap-2 px-1">
        {/* Origin First-Mile Walk */}
        {originWalk && originWalk.distanceKm > 0 && (
          <div className="flex items-center shrink-0">
            <WalkBadge walk={originWalk} />
            <div className="w-6 border-t-2 border-dashed border-border/50 mx-1" />
          </div>
        )}

        {/* Initial Origin Station */}
        <StationNode time={firstService.departureTime} station={firstService.originStation} />

        {/* Services and Interchanges */}
        {services.map((service, index) => {
          const config = MODE_CONFIG[service.type] || MODE_CONFIG.walk;
          const Icon = config.icon;
          const duration = formatDurationMs(
            new Date(service.arrivalTime).getTime() - new Date(service.departureTime).getTime()
          );
          const isLast = index === services.length - 1;
          const nextService = !isLast ? services[index + 1] : null;

          const layoverMs = nextService
            ? Math.max(0, new Date(nextService.departureTime).getTime() - new Date(service.arrivalTime).getTime())
            : 0;
          const isSameHub = nextService
            ? (service.destinationStation?.code || '') === (nextService.originStation?.code || '')
            : true;

          return (
            <div key={service.id || index} className="flex items-center shrink-0">
              {/* Transit Leg Segment */}
              <div className="flex flex-col items-center px-3 min-w-[170px]">
                <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
                  <span className={cn("text-xs font-mono font-medium", config.color)}>
                    {duration}
                  </span>
                  {service.isDelayed && (
                    <span className="text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2 py-1 rounded whitespace-nowrap">
                      Delayed
                    </span>
                  )}
                  {service.isCancelled && (
                    <span className="text-[10px] font-semibold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/25 px-2 py-1 rounded whitespace-nowrap">
                      Cancelled
                    </span>
                  )}
                </div>

                <div className="w-full relative flex items-center justify-center my-1">
                  <div className={cn("w-full border-t-2", config.line)} />
                  <div className="absolute px-3 py-1 rounded-full border border-border/60 shadow-2xs flex items-center gap-2 bg-card/95 whitespace-nowrap">
                    <Icon className={cn("w-4 h-4", config.color)} />
                    <span className="text-xs font-medium tracking-tight text-foreground">
                      {service.serviceNumber}
                    </span>
                  </div>
                </div>

                <span className="text-xs text-muted-foreground capitalize mt-1 whitespace-nowrap">
                  {service.operator?.name || config.label}
                </span>
              </div>

              {/* Shared Interchange Node */}
              {!isLast && nextService && (
                <div className="flex items-center shrink-0">
                  <div className="flex flex-col items-center bg-muted/25 border border-border/50 rounded-lg px-4 py-2 min-w-[150px] whitespace-nowrap">
                    {/* Arrival and Departure Timestamps */}
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1 whitespace-nowrap">
                      <span>arr {format(new Date(service.arrivalTime), 'HH:mm')}</span>
                      <span className="opacity-40">•</span>
                      <span>dep {format(new Date(nextService.departureTime), 'HH:mm')}</span>
                    </div>

                    {/* Shared Station Badge with Layover Pill */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="h-6 px-3 rounded-md bg-muted/80 border border-border/70 text-foreground font-mono font-semibold text-xs flex items-center justify-center whitespace-nowrap">
                        {service.destinationStation?.code || 'STN'}
                        {!isSameHub && ` → ${nextService.originStation?.code || 'STN'}`}
                      </div>

                      <div
                        className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-md bg-card border border-border/60 text-muted-foreground whitespace-nowrap"
                        title="Waypoint connection buffer"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{formatDurationMs(layoverMs)} layover</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    </div>

                    <span className="text-xs font-medium text-muted-foreground mt-1 text-center whitespace-nowrap">
                      {service.destinationStation?.city || ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Final Destination Station */}
        <StationNode time={lastService.arrivalTime} station={lastService.destinationStation} />

        {/* Destination Last-Mile Walk */}
        {destinationWalk && destinationWalk.distanceKm > 0 && (
          <div className="flex items-center shrink-0">
            <div className="w-6 border-t-2 border-dashed border-border/50 mx-1" />
            <WalkBadge walk={destinationWalk} />
          </div>
        )}
      </div>
    </div>
  );
}
