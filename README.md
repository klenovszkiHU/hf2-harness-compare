# HF2 Customer Distance Service

Small, offline REST service over PostgreSQL. Seeds 15 customers from
`seed-customers.json`, geocodes them against the bundled
`reference/city-coordinates.json` (no external geocoding API, no LLM calls
at runtime), and exposes two read endpoints.

## Prerequisites

- Node.js 24+
- Docker (for the bundled Postgres container)

## 1. Configure environment

```bash
cp .env.example .env
```

This sets `DATABASE_URL` (dev DB, port 5434), `TEST_DATABASE_URL` (test DB,
same container, separate database), and `PORT` (HTTP server port).

## 2. Install dependencies

```bash
npm install
```

## 3. Start Postgres

```bash
npm run db:up
```

Starts a `postgres:16-alpine` container on `localhost:5434` with two
databases: `hf2` (dev) and `hf2_test` (integration tests). The second
database is only created on the container's first boot — if you already
started it once before this existed, reset the volume once with
`docker compose down -v && npm run db:up`.

Stop it later with `npm run db:down`.

## 4. Run the migration

```bash
npm run migrate
```

Applies the Prisma migration in `prisma/migrations/` to the dev database
and creates the `customers` table.

## 5. Seed the data

```bash
npm run seed
```

Loads `seed-customers.json`, looks up each `location.city` +
`location.countryCode` in `reference/city-coordinates.json` (matching is
accent- and case-insensitive, whitespace-trimmed), and upserts each
customer keyed by `name`. Running it again does not duplicate rows. Any
city missing from the reference file gets `lat`/`lon = null` and a
console warning — it does not fail the seed.

## 6. Run the server

```bash
npm run dev     # ts-node/tsx watch mode
# or
npm run build && npm start   # compiled JS
```

### Endpoints

- `GET /customers/count` → `{ "count": 15 }`
- `GET /customers/by-distance` → all customers ascending by distance (km)
  to Budapest, each with a `distanceKm` field (1 decimal place). Budapest
  customers are `0`. Customers with unknown coordinates (`lat`/`lon`
  `null`) sort last with `distanceKm: null`. Ties break alphabetically by
  `name`.

## 7. Run the tests

```bash
npm test
```

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
