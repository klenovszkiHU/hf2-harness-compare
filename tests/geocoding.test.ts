// tests/geocoding.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildCityIndex,
  lookupCoordinates,
  normalizeCityName,
  type CityCoordinate,
} from '../src/lib/geocoding.js';

describe('normalizeCityName', () => {
  it('lowercases, trims, and strips diacritics', () => {
    expect(normalizeCityName('  Kraków ')).toBe('krakow');
    expect(normalizeCityName('BUDAPEST')).toBe('budapest');
    expect(normalizeCityName('Ljubljana')).toBe('ljubljana');
  });
});

describe('buildCityIndex / lookupCoordinates', () => {
  const fixture: CityCoordinate[] = [
    {
      city: 'Kraków',
      countryCode: 'PL',
      lat: 50.0614,
      lon: 19.9366,
      normalizedCity: 'krakow',
      source: 'test-fixture',
    },
    {
      city: 'Budapest',
      countryCode: 'HU',
      lat: 47.4979,
      lon: 19.0402,
      normalizedCity: 'budapest',
      source: 'test-fixture',
    },
  ];
  const index = buildCityIndex(fixture);

  it('matches regardless of case, whitespace, and diacritics', () => {
    expect(lookupCoordinates(index, '  KRAKOW  ', 'pl')).toEqual({ lat: 50.0614, lon: 19.9366 });
    expect(lookupCoordinates(index, 'kraków', 'PL')).toEqual({ lat: 50.0614, lon: 19.9366 });
  });

  it('returns null for a city not present in the reference data', () => {
    expect(lookupCoordinates(index, 'Atlantis', 'XX')).toBeNull();
  });

  it('does not match the same city name under a different country code', () => {
    expect(lookupCoordinates(index, 'Budapest', 'PL')).toBeNull();
  });
});
