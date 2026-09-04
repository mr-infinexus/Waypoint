export type ServiceType = 'flight' | 'train' | 'bus' | 'metro' | 'walk';

export type ItineraryStatus = 'active' | 'disrupted' | 'completed' | 'cancelled';

export type SortHeuristic = 'cheapest' | 'fastest' | 'transfers';

export interface Station {
  id: string;
  code: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Service {
  id: string;
  type: ServiceType;
  serviceNumber: string;
  operator?: Operator;
  originStation: Station;
  destinationStation: Station;
  departureTime: string;
  arrivalTime: string;
  price: number;
  seatCapacity: number;
  availableSeats?: number;
  vehicleLogo?: string;
  isDelayed: boolean;
  isCancelled: boolean;
}

export interface WalkLeg {
  distanceKm: number;
  durationMinutes: number;
  toStationId?: string;
  fromStationId?: string;
}

export interface SearchResultPath {
  services: Service[];
  totalPrice: number;
  totalDurationMs: number;
  totalDisplayDurationMs: number;
  transfers: number;
  originWalk: WalkLeg | null;
  destinationWalk: WalkLeg | null;
}

export interface Ticket {
  id: string;
  status: string;
  qrCode?: string;
}

export interface ItinerarySegment {
  id: string;
  segmentOrder: number;
  service: Service;
  tickets?: Ticket[];
}

export interface Itinerary {
  id: string;
  totalCost: number;
  status: ItineraryStatus;
  originWalk: WalkLeg | null;
  destinationWalk: WalkLeg | null;
  segments: ItinerarySegment[];
  createdAt: string;
  traveler?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AdminStats {
  totalOperators: number;
  activeItineraries: number;
  disruptedItineraries: number;
}
