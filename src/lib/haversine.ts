export const BUDAPEST = { lat: 47.4979, lon: 19.0402 };

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function distanceFromBudapestKm(
  point: { lat: number; lon: number } | null
): number | null {
  if (point === null) {
    return null;
  }
  return Math.round(haversineDistanceKm(BUDAPEST, point) * 10) / 10;
}
