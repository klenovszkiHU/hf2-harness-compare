import { readFileSync } from 'node:fs';

export interface CityCoordinate {
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  normalizedCity: string;
  source: string;
}

export interface CoordinateLookup {
  lat: number;
  lon: number;
}

export function normalizeCityName(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function loadCityCoordinates(filePath: string): CityCoordinate[] {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as CityCoordinate[];
}

function indexKey(city: string, countryCode: string): string {
  return `${normalizeCityName(city)}|${countryCode.trim().toUpperCase()}`;
}

export function buildCityIndex(entries: CityCoordinate[]): Map<string, CoordinateLookup> {
  const index = new Map<string, CoordinateLookup>();
  for (const entry of entries) {
    index.set(indexKey(entry.city, entry.countryCode), { lat: entry.lat, lon: entry.lon });
  }
  return index;
}

export function lookupCoordinates(
  index: Map<string, CoordinateLookup>,
  city: string,
  countryCode: string
): CoordinateLookup | null {
  return index.get(indexKey(city, countryCode)) ?? null;
}
