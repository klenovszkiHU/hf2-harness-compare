import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { loadCityCoordinates } from '../src/lib/geocoding.js';
import { loadSeedCustomers, seedCustomers } from '../src/lib/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const customers = loadSeedCustomers(path.join(__dirname, '..', 'seed-customers.json'));
  const cityCoordinates = loadCityCoordinates(
    path.join(__dirname, '..', 'reference', 'city-coordinates.json')
  );

  const result = await seedCustomers(prisma, customers, cityCoordinates);

  console.log(`Seeded ${result.seeded} customers.`);
  if (result.unmatchedCities.length > 0) {
    console.warn(`Unmatched cities (lat/lon set to null): ${result.unmatchedCities.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
