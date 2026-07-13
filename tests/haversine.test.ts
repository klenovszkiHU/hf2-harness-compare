import { describe, expect, it } from 'vitest';
import { BUDAPEST, distanceFromBudapestKm, haversineDistanceKm } from '../src/lib/haversine.js';

describe('haversineDistanceKm', () => {
  it('computes the known Budapest-Vienna distance (~214 km)', () => {
    const vienna = { lat: 48.2085, lon: 16.3721 };
    const distance = haversineDistanceKm(BUDAPEST, vienna);
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(225);
  });

  it('returns 0 for the same point (Budapest to Budapest)', () => {
    const distance = haversineDistanceKm(BUDAPEST, BUDAPEST);
    expect(distance).toBeCloseTo(0, 6);
  });
});

describe('distanceFromBudapestKm', () => {
  it('rounds to 1 decimal place', () => {
    const vienna = { lat: 48.2085, lon: 16.3721 };
    const distance = distanceFromBudapestKm(vienna);
    expect(distance).not.toBeNull();
    expect(Number.isInteger((distance as number) * 10)).toBe(true);
  });

  it('returns 0 for Budapest itself', () => {
    expect(distanceFromBudapestKm(BUDAPEST)).toBe(0);
  });

  it('returns null when the point is null', () => {
    expect(distanceFromBudapestKm(null)).toBeNull();
  });
});
