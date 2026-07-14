import { readFileSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
import { buildCityIndex, lookupCoordinates, type CityCoordinate } from './geocoding.js';

export interface SeedCustomerInput {
  name: string;
  budget?: number;
  location: { city: string; countryCode: string };
  note?: string;
}

export function loadSeedCustomers(filePath: string): SeedCustomerInput[] {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SeedCustomerInput[];
}

export interface SeedResult {
  seeded: number;
  unmatchedCities: string[];
}

export async function seedCustomers(
  prisma: PrismaClient,
  customers: SeedCustomerInput[],
  cityCoordinates: CityCoordinate[]
): Promise<SeedResult> {
  const index = buildCityIndex(cityCoordinates);
  const unmatchedCities: string[] = [];

  for (const customer of customers) {
    const coords = lookupCoordinates(index, customer.location.city, customer.location.countryCode);
    if (!coords) {
      unmatchedCities.push(`${customer.location.city} (${customer.location.countryCode})`);
      console.warn(
        `[seed] No coordinates found for ${customer.location.city}, ${customer.location.countryCode} ` +
          `— storing lat/lon as null for "${customer.name}"`
      );
    }

    await prisma.customer.upsert({
      where: { name: customer.name },
      create: {
        name: customer.name,
        telepules: customer.location.city,
        countryCode: customer.location.countryCode,
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
        budget: customer.budget ?? null,
        note: customer.note ?? null,
      },
      update: {
        telepules: customer.location.city,
        countryCode: customer.location.countryCode,
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
        budget: customer.budget ?? null,
        note: customer.note ?? null,
      },
    });
  }

  return { seeded: customers.length, unmatchedCities };
}
