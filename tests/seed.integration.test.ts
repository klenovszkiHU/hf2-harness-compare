import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { CityCoordinate } from '../src/lib/geocoding.js';
import { seedCustomers, type SeedCustomerInput } from '../src/lib/seed.js';
import { createTestPrismaClient } from './test-db.js';

const prisma = createTestPrismaClient();

const cityCoordinates: CityCoordinate[] = [
  {
    city: 'Budapest',
    countryCode: 'HU',
    lat: 47.4979,
    lon: 19.0402,
    normalizedCity: 'budapest',
    source: 'test-fixture',
  },
];

const customers: SeedCustomerInput[] = [
  { name: 'Test Customer One', budget: 100, location: { city: 'Budapest', countryCode: 'HU' }, note: 'n1' },
  { name: 'Test Customer Two', budget: 200, location: { city: 'Nowhere', countryCode: 'ZZ' }, note: 'n2' },
];

beforeEach(async () => {
  await prisma.customer.deleteMany({
    where: { name: { in: customers.map((c) => c.name) } },
  });
});

afterAll(async () => {
  await prisma.customer.deleteMany({
    where: { name: { in: customers.map((c) => c.name) } },
  });
  await prisma.$disconnect();
});

describe('seedCustomers', () => {
  it('inserts each customer once, geocoding known cities and nulling unknown ones', async () => {
    const result = await seedCustomers(prisma, customers, cityCoordinates);
    expect(result.seeded).toBe(2);
    expect(result.unmatchedCities).toEqual(['Nowhere (ZZ)']);

    const known = await prisma.customer.findUniqueOrThrow({ where: { name: 'Test Customer One' } });
    expect(known.lat).toBeCloseTo(47.4979, 4);
    expect(known.lon).toBeCloseTo(19.0402, 4);

    const unknown = await prisma.customer.findUniqueOrThrow({ where: { name: 'Test Customer Two' } });
    expect(unknown.lat).toBeNull();
    expect(unknown.lon).toBeNull();
  });

  it('is idempotent: running it twice does not duplicate rows', async () => {
    await seedCustomers(prisma, customers, cityCoordinates);
    await seedCustomers(prisma, customers, cityCoordinates);

    const count = await prisma.customer.count({
      where: { name: { in: customers.map((c) => c.name) } },
    });
    expect(count).toBe(2);
  });
});
