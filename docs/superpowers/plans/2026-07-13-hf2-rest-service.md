# HF2 Customer Distance Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, offline REST service over PostgreSQL that seeds 15 customers from `seed-customers.json`, geocodes them against the bundled `reference/city-coordinates.json`, and exposes `/customers/count` and `/customers/by-distance` (distance to Budapest, haversine) per `HF2_SPEC.md`.

**Architecture:** Node.js + TypeScript + Express HTTP layer, Prisma ORM over PostgreSQL for persistence, a pure-function `lib/` layer (haversine, city-name normalization/lookup) that carries its own unit tests with no DB dependency, and an idempotent seed script that upserts customers keyed by `name`. PostgreSQL runs in Docker Compose on a non-default port to avoid clashing with other local Postgres containers.

**Tech Stack:** Node 24, TypeScript 5, Express 4, Prisma 5 + `@prisma/client`, PostgreSQL 16 (Docker), Vitest (unit + integration tests), Supertest (HTTP assertions), `tsx` (TS execution for scripts/dev server), `dotenv` + `dotenv-cli`.

## Global Constraints

- Offline only: no external geocoding API, no LLM calls at runtime. Geocoding uses only `reference/city-coordinates.json`.
- `customers` table minimum columns: `id`, `name`, `telepules`, `lat` (nullable), `lon` (nullable). `budget` and `note` may also be stored.
- Seed must be idempotent: running it twice must not duplicate rows.
- City matching must be accent-insensitive, case-insensitive, and whitespace-trimmed.
- Unknown city → `lat`/`lon` = `null`, logged, not a crash.
- `GET /customers/count` → `{ "count": <int> }` matching actual row count.
- `GET /customers/by-distance` → ascending distance to Budapest, `distanceKm` rounded to 1 decimal, Budapest customers at 0 km, null-coordinate customers last, ties broken by `name`.
- No auth, no write endpoints beyond seeding, no frontend, no external geocoding/LLM.
- Small, focused commits — one per task below.
- Unit tests for haversine: a known distance (Budapest–Vienna ≈ 214 km), the 0 km case, and null-coordinate handling.
- README covering: Postgres startup, migration, seed, server, tests.

---

## File Structure

```
hf2-harness-compare/
├── docker-compose.yml                 # Postgres 16 container (dev + test DBs)
├── docker/
│   └── init-test-db.sh                # creates the hf2_test database on first container boot
├── .env.example                       # DATABASE_URL / TEST_DATABASE_URL / PORT template
├── .gitignore                         # node_modules, dist, .env, prisma generated client cache
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── prisma/
│   ├── schema.prisma                  # Customer model
│   └── seed.ts                        # CLI entrypoint, calls src/lib/seed.ts
├── src/
│   ├── lib/
│   │   ├── haversine.ts               # pure distance math, no DB/IO
│   │   ├── geocoding.ts               # normalizeCityName, buildCityIndex, lookupCoordinates
│   │   └── seed.ts                    # seedCustomers(prisma, customers, cityCoordinates)
│   ├── prisma-client.ts               # shared PrismaClient singleton
│   ├── routes/
│   │   └── customers.ts               # createCustomersRouter(prisma)
│   ├── app.ts                         # createApp(prisma) -> Express app (no listen)
│   └── server.ts                      # process entrypoint, calls app.listen
├── tests/
│   ├── setup.ts                       # loads .env for the test process
│   ├── test-db.ts                     # createTestPrismaClient() helper
│   ├── haversine.test.ts
│   ├── geocoding.test.ts
│   ├── seed.integration.test.ts
│   └── customers.routes.integration.test.ts
└── README.md
```

- `src/lib/*` holds every pure/business-logic function with zero I/O side effects beyond explicit params — this is what TDD targets directly.
- `src/routes` and `src/app.ts` are the thin HTTP layer; they call into `src/lib` and Prisma, no business logic lives there.
- `prisma/seed.ts` is a thin CLI wrapper; the actual idempotent logic lives in `src/lib/seed.ts` so it is unit/integration-testable without shelling out.

---

### Task 1: Project scaffolding, tooling, and dockerized Postgres

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `docker-compose.yml`
- Create: `docker/init-test-db.sh`
- Create: `.env.example`
- Modify: `.gitignore` (currently empty)
- Create: `tests/setup.ts`

**Interfaces:**
- Produces: npm scripts `db:up`, `db:down`, `migrate`, `migrate:deploy`, `test:migrate`, `seed`, `dev`, `build`, `start`, `test` that every later task assumes exist.
- Produces: env vars `DATABASE_URL`, `TEST_DATABASE_URL`, `PORT` read by later Prisma/Express/test code.

- [ ] **Step 1: Check Docker ports are free and running containers won't collide**

Run: `docker ps --format '{{.Names}} {{.Ports}}'`

Confirm nothing is already bound to `5434`. If something is, pick another free port and use it consistently in every file below.

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "hf2-customer-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "test:migrate": "bash -c 'set -a; source .env; set +a; DATABASE_URL=\"$TEST_DATABASE_URL\" prisma migrate deploy'",
    "seed": "tsx prisma/seed.ts",
    "pretest": "npm run test:migrate",
    "test": "vitest run"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.0",
    "@types/supertest": "^6.0.2",
    "dotenv": "^16.4.5",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 15000,
  },
});
```

- [ ] **Step 5: Write `tests/setup.ts`**

```typescript
import 'dotenv/config';
```

- [ ] **Step 6: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: hf2-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: hf2
      POSTGRES_PASSWORD: hf2
      POSTGRES_DB: hf2
    ports:
      - "5434:5432"
    volumes:
      - hf2_pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sh:/docker-entrypoint-initdb.d/init-test-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hf2 -d hf2"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  hf2_pgdata:
```

- [ ] **Step 7: Write `docker/init-test-db.sh` and make it executable**

```bash
#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE hf2_test;
EOSQL
```

Run: `chmod +x docker/init-test-db.sh`

This script only runs on the container's **first** boot (empty data volume). If you already started the container once without it, run `npm run db:down -- -v` (or `docker compose down -v`) to wipe the volume before `npm run db:up`, since this is a fresh project with no data worth preserving yet.

- [ ] **Step 8: Write `.env.example`**

```
DATABASE_URL="postgresql://hf2:hf2@localhost:5434/hf2"
TEST_DATABASE_URL="postgresql://hf2:hf2@localhost:5434/hf2_test"
PORT=3000
```

Run: `cp .env.example .env`

- [ ] **Step 9: Write `.gitignore`**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 11: Start Postgres and verify both databases exist**

Run: `npm run db:up`
Run: `sleep 3 && docker exec hf2-postgres pg_isready -U hf2 -d hf2`
Expected: `accepting connections`

Run: `docker exec hf2-postgres psql -U hf2 -d hf2 -c "\l" | grep hf2_test`
Expected: a line showing the `hf2_test` database exists.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts docker-compose.yml docker/init-test-db.sh .env.example .gitignore tests/setup.ts
git commit -m "chore: scaffold Node/TypeScript project with dockerized Postgres"
```

---

### Task 2: Prisma schema and initial migration

**Files:**
- Create: `prisma/schema.prisma`
- Create (generated by Prisma CLI): `prisma/migrations/<timestamp>_init/migration.sql`

**Interfaces:**
- Consumes: `DATABASE_URL` from `.env` (Task 1).
- Produces: `Customer` Prisma model with fields `id: Int`, `name: String` (unique), `telepules: String`, `countryCode: String`, `lat: Float?`, `lon: Float?`, `budget: Int?`, `note: String?`, `createdAt: DateTime`. Every later task's Prisma calls use these exact field names.

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Customer {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  telepules   String
  countryCode String
  lat         Float?
  lon         Float?
  budget      Int?
  note        String?
  createdAt   DateTime @default(now())

  @@map("customers")
}
```

Note on `name @unique`: the seed source (`seed-customers.json`) has no external customer id, and all 15 seed names are distinct. Using `name` as the idempotency key is the simplest correct choice for this fixed seed set — it is not a general production assumption, just documented here and in the README.

Note on `countryCode`: the spec's minimum model doesn't require it, but the seed data and reference file both key on `(city, countryCode)` pairs, so storing it keeps geocoding correctness auditable directly from the `customers` table. This is an addition beyond the spec's minimum, not a replacement for any required column.

- [ ] **Step 2: Generate the initial migration against the dev database**

Run: `npm run migrate -- --name init`
Expected: prompts resolved non-interactively (or answer "y" if asked to create the database), output ending with `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/`.

- [ ] **Step 3: Verify the table exists**

Run: `docker exec hf2-postgres psql -U hf2 -d hf2 -c "\d customers"`
Expected: a table description listing `id, name, telepules, country_code, lat, lon, budget, note, created_at` (Prisma's default snake_case mapping for multi-word fields — this is expected and fine since all access goes through Prisma's `Customer` model, not raw SQL).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Prisma Customer schema and initial migration"
```

---

### Task 3: Haversine distance module (TDD)

**Files:**
- Test: `tests/haversine.test.ts`
- Create: `src/lib/haversine.ts`

**Interfaces:**
- Produces: `BUDAPEST: { lat: number; lon: number }`, `haversineDistanceKm(from, to): number`, `distanceFromBudapestKm(point: { lat: number; lon: number } | null): number | null` — the `/customers/by-distance` route (Task 7) calls `distanceFromBudapestKm` directly.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/haversine.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/haversine.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/haversine.js'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/haversine.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/haversine.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/haversine.test.ts src/lib/haversine.ts
git commit -m "feat: add haversine distance calculation with tests"
```

---

### Task 4: City normalization and coordinate lookup module (TDD)

**Files:**
- Test: `tests/geocoding.test.ts`
- Create: `src/lib/geocoding.ts`

**Interfaces:**
- Consumes: `reference/city-coordinates.json` shape `{ city, countryCode, lat, lon, normalizedCity, source }[]` (already present in repo).
- Produces: `normalizeCityName(city: string): string`, `type CityCoordinate`, `loadCityCoordinates(filePath: string): CityCoordinate[]`, `buildCityIndex(entries: CityCoordinate[]): Map<string, { lat: number; lon: number }>`, `lookupCoordinates(index, city: string, countryCode: string): { lat: number; lon: number } | null`. Task 5's seed logic and Task 2's schema both rely on these exact names.

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geocoding.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/geocoding.js'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/geocoding.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geocoding.test.ts`
Expected: PASS (5 tests)

Note on Budapest districts: the spec allows (optionally) folding Budapest's
districts into the capital match. This is **intentionally not implemented**
— the seed data only ever uses the literal string `"Budapest"`, so there is
no district-name input to normalize against, and adding unused matching
logic would be speculative. If district strings ever appear in seed data,
extend `normalizeCityName` or add a district-to-capital alias table at that
point, backed by a new test.

- [ ] **Step 5: Commit**

```bash
git add tests/geocoding.test.ts src/lib/geocoding.ts
git commit -m "feat: add accent/case-insensitive city coordinate lookup with tests"
```

---

### Task 5: Idempotent seed logic + CLI entrypoint (TDD via integration test)

**Files:**
- Create: `tests/test-db.ts`
- Test: `tests/seed.integration.test.ts`
- Create: `src/lib/seed.ts`
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `Customer` Prisma model (Task 2), `buildCityIndex`/`lookupCoordinates`/`CityCoordinate`/`loadCityCoordinates` (Task 4).
- Produces: `SeedCustomerInput` type, `loadSeedCustomers(filePath): SeedCustomerInput[]`, `seedCustomers(prisma, customers, cityCoordinates): Promise<{ seeded: number; unmatchedCities: string[] }>` — reused by `prisma/seed.ts` and directly by this task's test.
- Produces: `tests/test-db.ts` exporting `createTestPrismaClient(): PrismaClient`, reused by Task 6 and 7's route integration tests.

- [ ] **Step 1: Write the shared test-DB helper**

```typescript
// tests/test-db.ts
import { PrismaClient } from '@prisma/client';

export function createTestPrismaClient(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up` first.'
    );
  }
  return new PrismaClient({ datasources: { db: { url } } });
}
```

- [ ] **Step 2: Write the failing integration test**

```typescript
// tests/seed.integration.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/seed.integration.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/seed.js'`

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/lib/seed.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:migrate && npx vitest run tests/seed.integration.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the CLI entrypoint**

```typescript
// prisma/seed.ts
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
```

- [ ] **Step 7: Run the real seed against the dev database and verify idempotency manually**

Run: `npm run seed`
Expected: `Seeded 15 customers.` and no unmatched-city warnings (every seed city is present in `reference/city-coordinates.json`).

Run: `npm run seed` again
Expected: same output, and:

Run: `docker exec hf2-postgres psql -U hf2 -d hf2 -c "SELECT COUNT(*) FROM customers;"`
Expected: `15` (not 30).

- [ ] **Step 8: Commit**

```bash
git add tests/test-db.ts tests/seed.integration.test.ts src/lib/seed.ts prisma/seed.ts
git commit -m "feat: add idempotent customer seeding with geocoding"
```

---

### Task 6: Express app + `GET /customers/count`

**Files:**
- Create: `src/prisma-client.ts`
- Create: `src/routes/customers.ts`
- Create: `src/app.ts`
- Create: `src/server.ts`
- Test: `tests/customers.routes.integration.test.ts`

**Interfaces:**
- Consumes: `Customer` Prisma model (Task 2), `createTestPrismaClient` (Task 5).
- Produces: `createApp(prisma: PrismaClient): Express`, `createCustomersRouter(prisma: PrismaClient): Router` — Task 7 adds a route to this same router file and extends this same test file.

- [ ] **Step 1: Write the failing test for `/customers/count`**

```typescript
// tests/customers.routes.integration.test.ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestPrismaClient } from './test-db.js';

const prisma = createTestPrismaClient();
const app = createApp(prisma);

const fixtureNames = ['Route Test Alpha', 'Route Test Beta', 'Route Test Gamma'];

beforeEach(async () => {
  await prisma.customer.deleteMany({ where: { name: { in: fixtureNames } } });
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { name: { in: fixtureNames } } });
  await prisma.$disconnect();
});

describe('GET /customers/count', () => {
  it('returns the actual row count', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[0], telepules: 'Budapest', countryCode: 'HU', lat: 47.4979, lon: 19.0402 },
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
      ],
    });

    const before = await prisma.customer.count();

    const response = await request(app).get('/customers/count');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: before });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/customers.routes.integration.test.ts`
Expected: FAIL — `Cannot find module '../src/app.js'`

- [ ] **Step 3: Write `src/prisma-client.ts`**

```typescript
// src/prisma-client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 4: Write `src/routes/customers.ts` with only the count route**

```typescript
// src/routes/customers.ts
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

export function createCustomersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/count', async (_req, res) => {
    const count = await prisma.customer.count();
    res.json({ count });
  });

  return router;
}
```

- [ ] **Step 5: Write `src/app.ts`**

```typescript
// src/app.ts
import express, { type Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createCustomersRouter } from './routes/customers.js';

export function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use('/customers', createCustomersRouter(prisma));
  return app;
}
```

- [ ] **Step 6: Write `src/server.ts`**

```typescript
// src/server.ts
import { createApp } from './app.js';
import { prisma } from './prisma-client.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = createApp(prisma);

app.listen(port, () => {
  console.log(`HF2 customer service listening on port ${port}`);
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/customers.routes.integration.test.ts`
Expected: PASS (1 test)

- [ ] **Step 8: Commit**

```bash
git add src/prisma-client.ts src/routes/customers.ts src/app.ts src/server.ts tests/customers.routes.integration.test.ts
git commit -m "feat: add Express app with GET /customers/count"
```

---

### Task 7: `GET /customers/by-distance`

**Files:**
- Modify: `src/routes/customers.ts`
- Modify: `tests/customers.routes.integration.test.ts`

**Interfaces:**
- Consumes: `distanceFromBudapestKm` (Task 3).
- Produces: nothing further consumed by later tasks (last route in this plan).

- [ ] **Step 1: Add failing tests for `/customers/by-distance`**

Append to `tests/customers.routes.integration.test.ts`:

```typescript
describe('GET /customers/by-distance', () => {
  it('orders ascending by distance to Budapest, nulls last, ties by name', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[0], telepules: 'Budapest', countryCode: 'HU', lat: 47.4979, lon: 19.0402 },
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
        { name: fixtureNames[2], telepules: 'Nowhere', countryCode: 'ZZ', lat: null, lon: null },
      ],
    });

    const response = await request(app).get('/customers/by-distance');
    expect(response.status).toBe(200);

    const fixtureOnly = response.body.filter((c: { name: string }) => fixtureNames.includes(c.name));
    expect(fixtureOnly.map((c: { name: string }) => c.name)).toEqual([
      fixtureNames[0],
      fixtureNames[1],
      fixtureNames[2],
    ]);
    expect(fixtureOnly[0].distanceKm).toBe(0);
    expect(fixtureOnly[1].distanceKm).toBeGreaterThan(200);
    expect(fixtureOnly[1].distanceKm).toBeLessThan(225);
    expect(fixtureOnly[2].distanceKm).toBeNull();
  });

  it('breaks ties by name when distances are equal', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
        { name: fixtureNames[0], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
      ],
    });

    const response = await request(app).get('/customers/by-distance');
    const fixtureOnly = response.body.filter((c: { name: string }) => fixtureNames.includes(c.name));

    expect(fixtureOnly[0].name).toBe(fixtureNames[0]);
    expect(fixtureOnly[1].name).toBe(fixtureNames[1]);
    expect(fixtureOnly[0].distanceKm).toBe(fixtureOnly[1].distanceKm);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/customers.routes.integration.test.ts`
Expected: FAIL — 404/undefined route or `distanceKm` missing from response body.

- [ ] **Step 3: Implement the route**

Replace the contents of `src/routes/customers.ts`:

```typescript
// src/routes/customers.ts
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { distanceFromBudapestKm } from '../lib/haversine.js';

export function createCustomersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/count', async (_req, res) => {
    const count = await prisma.customer.count();
    res.json({ count });
  });

  router.get('/by-distance', async (_req, res) => {
    const customers = await prisma.customer.findMany();

    const withDistance = customers.map((customer) => ({
      ...customer,
      distanceKm:
        customer.lat !== null && customer.lon !== null
          ? distanceFromBudapestKm({ lat: customer.lat, lon: customer.lon })
          : null,
    }));

    withDistance.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.name.localeCompare(b.name);
    });

    res.json(withDistance);
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/customers.routes.integration.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files PASS (haversine, geocoding, seed integration, routes integration).

- [ ] **Step 6: Manual smoke test against the seeded dev database**

Run: `npm run dev &` then, once "listening on port 3000" appears:

Run: `curl -s http://localhost:3000/customers/count`
Expected: `{"count":15}`

Run: `curl -s http://localhost:3000/customers/by-distance | head -c 400`
Expected: JSON array starting with the Budapest customer (`distanceKm: 0`), ascending thereafter.

Stop the dev server (`kill %1` or Ctrl+C) when done.

- [ ] **Step 7: Commit**

```bash
git add src/routes/customers.ts tests/customers.routes.integration.test.ts
git commit -m "feat: add GET /customers/by-distance sorted by haversine distance to Budapest"
```

---

### Task 8: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: every script name and env var introduced in Tasks 1–7 (documents them; does not add new ones).

- [ ] **Step 1: Write `README.md`**

```markdown
# HF2 Customer Distance Service

Small, offline REST service over PostgreSQL. Seeds 15 customers from
`seed-customers.json`, geocodes them against the bundled
`reference/city-coordinates.json` (no external geocoding API, no LLM calls
at runtime), and exposes two read endpoints.

## Prerequisites

- Node.js 24+
- Docker (for the bundled Postgres container)

## 1. Configure environment

\`\`\`bash
cp .env.example .env
\`\`\`

This sets `DATABASE_URL` (dev DB, port 5434), `TEST_DATABASE_URL` (test DB,
same container, separate database), and `PORT` (HTTP server port).

## 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

## 3. Start Postgres

\`\`\`bash
npm run db:up
\`\`\`

Starts a `postgres:16-alpine` container on `localhost:5434` with two
databases: `hf2` (dev) and `hf2_test` (integration tests). The second
database is only created on the container's first boot — if you already
started it once before this existed, reset the volume once with
`docker compose down -v && npm run db:up`.

Stop it later with `npm run db:down`.

## 4. Run the migration

\`\`\`bash
npm run migrate
\`\`\`

Applies the Prisma migration in `prisma/migrations/` to the dev database
and creates the `customers` table.

## 5. Seed the data

\`\`\`bash
npm run seed
\`\`\`

Loads `seed-customers.json`, looks up each `location.city` +
`location.countryCode` in `reference/city-coordinates.json` (matching is
accent- and case-insensitive, whitespace-trimmed), and upserts each
customer keyed by `name`. Running it again does not duplicate rows. Any
city missing from the reference file gets `lat`/`lon = null` and a
console warning — it does not fail the seed.

## 6. Run the server

\`\`\`bash
npm run dev     # ts-node/tsx watch mode
# or
npm run build && npm start   # compiled JS
\`\`\`

### Endpoints

- `GET /customers/count` → `{ "count": 15 }`
- `GET /customers/by-distance` → all customers ascending by distance (km)
  to Budapest, each with a `distanceKm` field (1 decimal place). Budapest
  customers are `0`. Customers with unknown coordinates (`lat`/`lon`
  `null`) sort last with `distanceKm: null`. Ties break alphabetically by
  `name`.

## 7. Run the tests

\`\`\`bash
npm test
\`\`\`

`pretest` runs `prisma migrate deploy` against `TEST_DATABASE_URL`
automatically, so the test database schema always matches
`prisma/schema.prisma` before the suite runs. Covers:

- `tests/haversine.test.ts` — pure unit tests: known Budapest–Vienna
  distance (~214 km), the 0 km Budapest-to-Budapest case, null-coordinate
  handling.
- `tests/geocoding.test.ts` — city name normalization and lookup
  (case/diacritic/whitespace insensitivity, unmatched cities).
- `tests/seed.integration.test.ts` — seeding is idempotent and correctly
  nulls out unmatched cities (hits the real `hf2_test` database).
- `tests/customers.routes.integration.test.ts` — both endpoints end to end
  via Supertest (hits the real `hf2_test` database).

## Design notes / assumptions

- `customers.name` is the idempotency key for seeding. The fixed 15-row
  seed set has no external id and no duplicate names — this is a
  deliberate simplification for this dataset, not a general-purpose
  production assumption.
- `customers.countryCode` is stored in addition to the spec's minimum
  columns (`id`, `telepules`, `lat`, `lon`) because geocoding matches on
  the `(city, countryCode)` pair from the reference file; keeping it on
  the row makes that match auditable from the table itself.
- Budapest's reference coordinate is `lat 47.4979, lon 19.0402` (see
  `reference/city-coordinates.json`), sourced from geodatos.net during the
  reference file's creation.

## Out of scope

Auth, write endpoints beyond seeding, a frontend, external geocoding, and
LLM calls — all intentionally excluded per `HF2_SPEC.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README for setup, seeding, running, and testing"
```

---

## Post-plan verification checklist

After Task 8, confirm end to end before calling this done:

1. `docker compose down -v && npm run db:up` (clean slate)
2. `npm run migrate`
3. `npm run seed` — twice, confirm row count stays at 15 both times
4. `npm test` — all suites green
5. `npm run dev`, then `curl localhost:3000/customers/count` and
   `curl localhost:3000/customers/by-distance` manually match the spec's
   described shape and ordering
