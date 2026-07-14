---
stepsCompleted: [1, 2, 3]
inputDocuments: ['__bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md', '__bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md']
---

# hf2-customer-distance-service - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for hf2-customer-distance-service, decomposing the requirements from SPEC.md (used in place of a PRD — this project ran the bmad-spec workflow, not bmad-prd) and ARCHITECTURE-SPINE.md into implementable stories. No UX design contract exists or is needed: SPEC.md lists "no frontend/UI" as an explicit non-goal.

## Requirements Inventory

### Functional Requirements

FR1: System loads `seed-customers.json` into a `customers` table and geocodes each customer's city via the bundled `reference/city-coordinates.json`, re-running without duplicating rows. (SPEC CAP-1)
FR2: A client can call `GET /customers/count` to get the total seeded customer count. (SPEC CAP-2)
FR3: A client can call `GET /customers/by-distance` to get all customers ordered by ascending distance to Budapest, each annotated with `distanceKm`. (SPEC CAP-3)

### NonFunctional Requirements

NFR1: Offline only — no external geocoding API call and no LLM call at runtime, for seeding or serving.
NFR2: `customers` table minimum columns: `id`, `name`, `telepules`, `lat` (nullable), `lon` (nullable); `budget` and `note` may also be stored but are not required.
NFR3: City-name matching for geocoding must be accent-insensitive, case-insensitive, and whitespace-trimmed; "Budapest" (optionally its districts) resolves to the capital's coordinates.
NFR4: A city absent from the reference file is not an error: store `lat`/`lon` as `null`, log it, continue seeding the rest.
NFR5: Haversine distance calculation needs dedicated unit tests covering: a known real distance (Budapest–Vienna, ≈214 km), the 0 km self-distance case, and null-coordinate handling.
NFR6: Delivery must land as small, focused commits so the build process itself is inspectable.
NFR7: A README must cover: starting Postgres, running the migration, seeding, starting the server, and running the tests.

### Additional Requirements

- No starter/greenfield template specified in Architecture — the project is hand-assembled from `src/`, `scripts/`, `migrations/` per the ARCHITECTURE-SPINE.md structural seed (no scaffolding tool to run in Epic 1 Story 1).
- Stack is fixed: Node.js 24, Express 5.2.1, `pg` 8.22.0 (no ORM), `node-pg-migrate` 8.0.x. (AD-1)
- Seed/geocode runs as a separate CLI script (`npm run seed`), never invoked by the server on boot. (AD-2)
- Schema changes are `node-pg-migrate` migration files under `migrations/`, run via `npm run migrate`. (AD-3)
- Idempotency is enforced at the DB level: `UNIQUE (name, telepules)` constraint + `INSERT ... ON CONFLICT DO NOTHING`. (AD-4)
- Haversine lives in a pure, dependency-free module `lib/haversine.js`; `null` coordinate input returns `null` (never throws, never `NaN`). (AD-5)
- City-name normalization lives in one function, `lib/normalizeCity.js`, called only from the seed service. (AD-6)
- One config module (`src/db/pool.js`) owns `DATABASE_URL`; `PORT` (default 3000) is read only by `src/server.js`. (AD-7)
- Tests run via Node's built-in `node:test` (`npm test`) — no added test-framework dependency. (AD-8)
- Response payload shapes are pinned exactly: `count()` returns a coerced `number` (not the raw string `pg` returns for `COUNT`); `byDistance()` returns exactly `{id, name, telepules, budget, note, distanceKm}` per item, camelCase, in that order — `lat`/`lon` are not part of the response contract. (AD-9)
- Offline-only is enforced at the dependency level: no HTTP client to an external geocoding service and no LLM/AI SDK may be added as a dependency. (AD-10)
- Unhandled errors respond `500` with `{"error": "internal error"}`; no stack trace is leaked to the client.
- `package.json` scripts are fixed: `migrate`, `seed`, `start`, `test`.

### UX Design Requirements

Not applicable — no frontend/UI (SPEC non-goal); no UX design contract exists for this project.

### FR Coverage Map

FR1: Epic 1 - idempotent seed + geocode; provides the data foundation the other two FRs depend on
FR2: Epic 1 - GET /customers/count
FR3: Epic 1 - GET /customers/by-distance

## Epic List

### Epic 1: Customer Distance Query Service
An API client can query the size of the seeded customer base and retrieve the full customer list ordered by distance to Budapest — one standalone, independently deployable and testable service.
**FRs covered:** FR1, FR2, FR3

## Epic 1: Customer Distance Query Service

An API client can query the size of the seeded customer base and retrieve the full customer list ordered by distance to Budapest — one standalone, independently deployable and testable service.

### Story 1.1: Idempotent Customer Seed & Geocoding

As an operator running this service,
I want to seed the `customers` table from `seed-customers.json` with geocoded coordinates,
So that the API endpoints have complete, correct data to serve.

**Acceptance Criteria:**

**Given** the migrations have not yet been applied
**When** I run `npm run migrate`
**Then** the `customers` table is created with `id, name, telepules, lat (nullable), lon (nullable), budget, note`
**And** a `UNIQUE (name, telepules)` constraint exists on the table

**Given** a fresh, migrated database
**When** I run `npm run seed`
**Then** all 15 customers from `seed-customers.json` are inserted with `name`, `telepules`, `budget`, `note` populated
**And** each customer whose (city, countryCode) matches `reference/city-coordinates.json` (accent/case/whitespace-insensitive; "Budapest" and its districts resolving to the capital) has `lat`/`lon` populated from that entry
**And** a customer with no matching reference entry has `lat`/`lon` set to `null`, a warning is logged, and seeding continues without crashing

**Given** the seed has already been run once
**When** I run `npm run seed` again
**Then** the table still contains exactly the same rows — no duplicates — enforced by the DB `UNIQUE (name, telepules)` constraint plus `ON CONFLICT DO NOTHING`, not application-side check logic

### Story 1.2: Customer Count Endpoint

As an API consumer,
I want to call `GET /customers/count`,
So that I know how many customers are currently seeded.

**Acceptance Criteria:**

**Given** the `customers` table contains N rows (seeded per Story 1.1)
**When** I call `GET /customers/count`
**Then** the response body is exactly `{"count": N}`, with `count` as a JSON number — not the raw string `pg` returns for `COUNT` — matching the live row count
**And** the response is not served from any cache that could go stale relative to the table's current state

### Story 1.3: Customers Ranked By Distance Endpoint

As an API consumer,
I want to call `GET /customers/by-distance`,
So that I can see all customers ordered by proximity to Budapest, each annotated with its distance.

**Acceptance Criteria:**

**Given** customers with known coordinates exist
**When** I call `GET /customers/by-distance`
**Then** every element is exactly `{id, name, telepules, budget, note, distanceKm}` (camelCase, `lat`/`lon` excluded)
**And** `distanceKm` is a number rounded to 1 decimal
**And** the list is ordered ascending by `distanceKm`

**Given** a customer's `telepules` resolves to Budapest
**When** the list is computed
**Then** that customer's `distanceKm` is `0` and they sort first, subject to the name tie-break

**Given** a customer has `null` `lat`/`lon`
**When** the list is computed
**Then** that customer's `distanceKm` is `null` and they sort after every customer with a known distance

**Given** two or more customers share the same `distanceKm` (including the Budapest-0km case and the null case)
**When** the list is computed
**Then** ties are broken by `name` ascending

**Given** `lib/haversine.js` as a standalone module
**When** it is unit-tested directly via `node --test` (not through HTTP)
**Then** it passes the 3 required cases: Budapest–Vienna ≈214 km, 0 km self-distance, and `null`-coordinate input returning `null`
