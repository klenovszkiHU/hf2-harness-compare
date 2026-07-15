# Story 1.3: Customers Ranked By Distance Endpoint

Status: ready-for-dev

## Story

As an API consumer,
I want to call `GET /customers/by-distance`,
so that I can see all customers ordered by proximity to Budapest, each annotated with its distance.

## Acceptance Criteria

1. **Given** customers with known coordinates exist, **When** I call `GET /customers/by-distance`, **Then** the response is a **bare JSON array** (no `{data: [...]}` or any other envelope) **And** every element is exactly `{id, name, telepules, budget, note, distanceKm}` (camelCase, `lat`/`lon` excluded, in that key order) **And** `distanceKm` is a number rounded to 1 decimal **And** the list is ordered ascending by `distanceKm`. [Source: SPEC.md CAP-3; ARCHITECTURE-SPINE.md AD-9, Consistency Conventions]
2. **Given** a customer's `telepules` resolves to Budapest, **When** the list is computed, **Then** that customer's `distanceKm` is `0` and they sort first, subject to the name tie-break. [Source: SPEC.md CAP-3]
3. **Given** a customer has `null` `lat`/`lon`, **When** the list is computed, **Then** that customer's `distanceKm` is `null` and they sort after every customer with a known distance. [Source: SPEC.md CAP-3]
4. **Given** two or more customers share the same **rounded** `distanceKm` (including the Budapest-0km case and the null case), **When** the list is computed, **Then** ties are broken by `name` ascending. Compare the rounded (1-decimal) value, not the raw haversine output — two customers 213.96 km and 214.04 km away both round to `214.0` and must be treated as tied. [Source: SPEC.md CAP-3]
5. **Given** `src/lib/haversine.js` as a standalone module, **When** it is unit-tested directly via `node --test` (not through HTTP), **Then** it passes the 3 required cases: Budapest–Vienna ≈214 km, 0 km self-distance, and `null`-coordinate input returning `null`. [Source: SPEC.md Constraints; ARCHITECTURE-SPINE.md AD-5]
6. **Given** the database connection is down or the query fails, **When** I call `GET /customers/by-distance`, **Then** the response is `500` with body `{"error": "internal error"}` — same convention as Story 1.2's `/customers/count`. [Source: ARCHITECTURE-SPINE.md Consistency Conventions — Errors]
7. **Given** the `customers` table is empty (0 rows), **When** I call `GET /customers/by-distance`, **Then** the response is `200` with an empty array `[]` — not an error, not `null`. [Source: SPEC.md CAP-3 — the general case includes the empty-table edge, same principle as Story 1.2's AC #4]

## Tasks / Subtasks

- [ ] Task 1: `src/lib/haversine.js` — pure distance function (AC: #5)
  - [ ] Export a pure function `(lat1, lon1, lat2, lon2) => km`, importing nothing beyond the standard library (AD-5) — no DB, no HTTP, no imports from `src/services` or `src/db`
  - [ ] **Null-input contract:** if `lat1`, `lon1`, `lat2`, or `lon2` is `null` (or `undefined`), return `null` — never `NaN`, never throw. This is the exact behavior `customerService.byDistance()` (Task 3) depends on to produce `distanceKm: null` without its own duplicate null-check (AD-5's explicit rule)
  - [ ] Standard haversine formula, Earth radius 6371 km
- [ ] Task 2: `src/routes/customers.js` — add the new route (AC: #1)
  - [ ] Add `GET /by-distance` to the **existing** router from Story 1.2 (do not create a second router or a new file) — delegate to `customerService.byDistance()`, shape the response via `res.json(...)`
  - [ ] Same error-forwarding pattern as `/count` (Story 1.2): `try/catch` + `next(err)`, so a rejection reaches `src/server.js`'s existing error middleware (AC #6) — do not add a second error handler
- [ ] Task 3: `src/services/customerService.js` — add `byDistance()` (AC: #1, #2, #3, #4, #7)
  - [ ] Add a `byDistance(queryable = pool)` export alongside the existing `count()` (same file, same optional-`queryable` pattern established in Story 1.2 for transactional testability) — query all rows: `SELECT id, name, telepules, lat, lon, budget, note FROM customers`
  - [ ] Get Budapest's reference coordinates by reading `reference/city-coordinates.json` (e.g. `require('../../reference/city-coordinates.json')` — Node's `require()` cache means this only loads/parses once per process, no need for manual caching) and finding the entry where `normalizedCity === 'budapest'` — **do not hardcode a second copy of Budapest's lat/lon as a literal**; that file is already the single source of truth for this data (same reuse principle as `src/services/seedService.js` in Story 1.1)
  - [ ] For each row, compute `distanceKm` via `src/lib/haversine.js` against the Budapest reference point, rounded to 1 decimal (`Math.round(km * 10) / 10`) when non-null
  - [ ] **Coerce `budget` to a JS `number`** (or `null` if the column is `null`) before returning — `pg` returns `numeric(10,2)` columns as strings by default, the same gotcha already fixed for `COUNT(*)` in Story 1.2's `count()`; do not ship `budget` as a string
  - [ ] Sort: ascending by `distanceKm`, with `null` sorting after every numeric value, ties (including two `0`s or two `null`s) broken by `name` ascending — this sort happens in JS after fetching all rows, since `distanceKm` isn't a stored column
  - [ ] Return exactly `{id, name, telepules, budget, note, distanceKm}` per row, in that key order, `lat`/`lon` excluded from the shape
- [ ] Task 4: Automated tests (uses `node:test`, per AD-8)
  - [ ] The 3 required `haversine.js` unit tests (AC #5): Budapest–Vienna ≈214 km (assert within a small tolerance, e.g. ±1 km, not an exact float match), 0 km self-distance (same point twice), `null` input (any of the 4 args) returns `null`
  - [ ] Test: `customerService.byDistance()` against the live 15-row dataset — assert the Budapest customer (`Anna Kovács`) is first with `distanceKm: 0`, the list is non-decreasing by `distanceKm`, and every element has exactly the 6 expected keys (no `lat`/`lon` leaking through)
  - [ ] Test: `budget` in the response is a `number`, not a string (same class of regression as Story 1.2's `COUNT(*)` gotcha)
  - [ ] Test: tie-break by `name` — construct a small in-memory scenario (or use `byDistance(client)` inside an uncommitted transaction, same technique as Story 1.2's empty-table test, to insert two synthetic same-distance rows) confirming `name` ascending order for ties
  - [ ] Test: null-coordinate customers sort last — same transactional-test technique: insert a synthetic customer with `lat`/`lon = null`, confirm it appears after all known-distance customers with `distanceKm: null`
  - [ ] Integration test: `GET /customers/by-distance` over HTTP (same `app.listen(0)` pattern as Story 1.2) returns `200` with the ordering/shape holding for the real dataset, and the response is a bare array (`Array.isArray(body)`, AC #1)
  - [ ] Test: `GET /customers/by-distance` returns `500` `{"error": "internal error"}` on a forced service rejection (same monkey-patch technique used for `/count` in Story 1.2's code review)
  - [ ] Test: `byDistance()` returns `[]` for an empty table (AC #7) — same uncommitted-transaction technique as the other synthetic-data tests above
- [ ] Task 5: `docker-compose.yml` + `README.md` (AC: none directly — SPEC's NFR7 and success signal; this is the last story in Epic 1, and only now do all the pieces it must document exist)
  - [ ] **Add a `docker-compose.yml` to the repo root.** There is currently no `docker-compose.yml` anywhere in this repository — the `hf2-postgres` container all 3 stories have developed against so far was started from a *different* git branch's compose file and happens to still be running on this machine. That is not reproducible from a fresh clone of this branch. Define a `postgres` service matching the config already in use (so existing local state keeps working): image `postgres:16-alpine`, `container_name: hf2-postgres`, `POSTGRES_USER=hf2`, `POSTGRES_PASSWORD=hf2`, `POSTGRES_DB=hf2`, port mapping `"5434:5432"`, a named volume for data persistence
  - [ ] Document, in order, in `README.md`: starting Postgres (`docker compose up -d`), running the migration (`npm run migrate`), seeding (`npm run seed`), starting the server (`npm start`), running the tests (`npm test`)
  - [ ] Include the two example `curl` commands from SPEC's success signal (`GET /customers/count`, `GET /customers/by-distance`) so the documented command sequence is directly demonstrable, matching SPEC's own success signal wording

## Dev Notes

- **Architecture is fully fixed for this story** — read `__bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md` in full before starting. Relevant ADs: AD-1 (no ORM), AD-5 (haversine pure module + null contract), AD-6 (reuse the reference-file lookup pattern, don't duplicate data), AD-7 (no new config reads — reuse `src/db/pool.js`), AD-8 (`node:test`), AD-9 (exact response shape + numeric coercion — this is the second time this project has hit the "pg returns numeric columns as strings" gotcha; treat it as an established pattern, not a one-off).
- **Extend, don't duplicate, Story 1.2's files.** `src/routes/customers.js` and `src/services/customerService.js` already exist with a `/count` route and a `count()` export — add `/by-distance` and `byDistance()` to the *same* files. Do not create `src/routes/byDistance.js` or a second service file; the paradigm and the ARCHITECTURE-SPINE's Structural Seed both describe one `customers.js` route file and one `customerService.js` covering both capabilities.
- **Reuse `src/lib/normalizeCity.js`'s reuse pattern for the Budapest lookup, not its code.** You do NOT need `normalizeCity()` here — the reference file's `normalizedCity: "budapest"` entry can be matched by a literal string comparison since you're looking for exactly one known key, not normalizing arbitrary user input. Don't import `normalizeCity` into `customerService.js` for this; that would blur AD-6's "one owner" rule (normalization is `seedService`'s concern, not `customerService`'s).
- **The `budget` numeric-coercion gotcha is the main risk in this story**, same class of bug as Story 1.2's `COUNT(*)` string-vs-number issue and Story 1.1's original code-review finding about untested "verified" claims. Given this project's history (two prior stories where an un-coerced `pg` numeric type silently leaked into a JSON response, and one prior incident where a claimed-verified behavior turned out untested), write the number-type test for `budget` and actually run it — don't assume `pg`'s driver behavior from memory.
- **Learning from Story 1.2's code review:** don't claim an AC "verified" in Completion Notes unless an automated test actually exercises it — the 500/error-path test for AC #6 must exist before this story is marked complete, following the same monkey-patch pattern already established for `/count`.
- **Sorting nulls last is a JS-side concern, not SQL.** `distanceKm` doesn't exist as a column — it's computed per-request from `lat`/`lon` via the haversine function. Fetch all rows, compute `distanceKm` for each, then sort the in-memory array. A comparator that naively does `a.distanceKm - b.distanceKm` breaks on `null` (arithmetic with `null` coerces to `0`, which would incorrectly sort null-distance customers as if they were at Budapest) — handle the `null` case explicitly in the comparator before falling back to numeric comparison, then to `name`.
- **The tie-break and null-sort tests need synthetic data, and the real 15-row dataset only exercises the "happy path".** Reuse Story 1.2's uncommitted-transaction technique (`pool.connect()` → `BEGIN` → insert synthetic rows → call `byDistance(client)` → assert → `ROLLBACK`) so these edge-case tests never touch the real dataset or race with other test files — this is now an established project pattern, not a one-off improvisation.
- **README scope:** this is the only story that touches `README.md`. Story 1.1's Dev Notes explicitly flagged this gap and recommended folding it into whichever story lands last — that's this one. Keep it factual and command-sequence-focused, matching SPEC's own success signal; it's a process/delivery document, not a design document, so it shouldn't duplicate ARCHITECTURE-SPINE.md's content.

### Project Structure Notes

This story creates: `src/lib/haversine.js`, `docker-compose.yml`, `README.md`, plus `test/` files for Task 4. It **modifies** (not creates) `src/routes/customers.js` and `src/services/customerService.js` (adding to the existing exports from Story 1.2). No new top-level source directories. After this story, Epic 1 is functionally complete: `src/server.js`, `src/routes/`, `src/services/`, `src/lib/` (haversine + normalizeCity), `src/db/`, `scripts/seed.js`, and `migrations/` all exist per ARCHITECTURE-SPINE.md's Structural Seed.

### References

- [Source: __bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md#Capabilities — CAP-3]
- [Source: __bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md#Constraints] (haversine test requirements, README requirement — NFR5, NFR7)
- [Source: __bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md#Success-signal] (the exact curl-demonstrable command sequence README must document)
- [Source: __bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md#Invariants--Rules — AD-1, AD-5, AD-6, AD-7, AD-8, AD-9]
- [Source: __bmad-output/planning-artifacts/epics.md#Epic-1-Customer-Distance-Query-Service — Story 1.3]
- [Source: __bmad-output/implementation-artifacts/1-2-customer-count-endpoint.md#Dev-Agent-Record] (established patterns to reuse: optional-`queryable` param, uncommitted-transaction test technique, monkey-patch error test, numeric coercion vigilance)
- [Source: reference/city-coordinates.json] (Budapest's reference lat/lon — read at runtime, not hardcoded)

## Dev Agent Record

### Agent Model Used

_(to be filled in by the dev agent during implementation)_

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
