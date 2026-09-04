import { Station } from '../entities/Station';

export const MAX_WALK_RADIUS_KM = 2;
export const MAX_CANDIDATE_STATIONS = 4;
export const WALKING_SPEED_KMH = 4.5;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface StationCandidate {
  station: Station;
  distanceKm: number;
  walkMinutes: number;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function walkMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / WALKING_SPEED_KMH) * 60);
}

export function findNearbyStations(
  point: GeoPoint,
  allStations: Station[],
  radiusKm = MAX_WALK_RADIUS_KM,
  maxCount = MAX_CANDIDATE_STATIONS,
): StationCandidate[] {
  return allStations
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => {
      const distanceKm = haversineKm(point, { lat: Number(s.latitude), lng: Number(s.longitude) });
      return { station: s, distanceKm, walkMinutes: walkMinutes(distanceKm) };
    })
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, maxCount);
}
