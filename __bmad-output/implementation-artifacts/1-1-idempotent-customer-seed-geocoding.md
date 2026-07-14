---
baseline_commit: 3eee25af1e18cacf54dfd51bdd29065b81361052
---

# Story 1.1: Idempotent Customer Seed & Geocoding

Status: review

## Story

As an operator running this service,
I want to seed the `customers` table from `seed-customers.json` with geocoded coordinates,
so that the API endpoints (Stories 1.2/1.3) have complete, correct data to serve.

## Acceptance Criteria

1. **Given** the migrations have not yet been applied, **When** I run `npm run migrate`, **Then** the `customers` table is created with `id, name, telepules, lat (nullable), lon (nullable), budget, note` **And** a `UNIQUE (name, telepules)` constraint exists on the table. [Source: SPEC.md CAP-1; ARCHITECTURE-SPINE.md AD-3, AD-4]
2. **Given** a fresh, migrated database, **When** I run `npm run seed`, **Then** all 15 customers from `seed-customers.json` are inserted with `name`, `telepules`, `budget`, `note` populated **And** each customer whose (city, countryCode) matches `reference/city-coordinates.json` (accent/case/whitespace-insensitive; "Budapest" and its districts resolving to the capital) has `lat`/`lon` populated from that entry **And** a customer with no matching reference entry has `lat`/`lon` set to `null`, a warning is logged, and seeding continues without crashing. [Source: SPEC.md CAP-1; ARCHITECTURE-SPINE.md AD-6]
3. **Given** the seed has already been run once, **When** I run `npm run seed` again, **Then** the table still contains exactly the same rows — no duplicates — enforced by the DB `UNIQUE (name, telepules)` constraint plus `ON CONFLICT DO NOTHING`, not application-side check logic. [Source: SPEC.md CAP-1; ARCHITECTURE-SPINE.md AD-4]

## Tasks / Subtasks

- [x] Task 1: Project scaffold (AC: #1, #2, #3 — everything depends on this existing)
  - [x] `npm init`; add dependencies pinned exactly per Stack table: `express@5.2.1`, `pg@8.22.0`, `node-pg-migrate@8.0.x` (verify exact patch on npmjs.com before pinning — sources disagreed on 8.0.3 vs 8.0.4, see Dev Notes)
  - [x] Create the directory structure exactly as in ARCHITECTURE-SPINE.md's Structural Seed: `src/{db,routes,services,lib}`, `scripts/`, `migrations/`, `test/`
  - [x] `package.json` scripts, fixed names (no others): `migrate` → `node-pg-migrate up`, `seed` → `node scripts/seed.js`, `start` → `node src/server.js`, `test` → `node --test`
  - [x] `src/db/pool.js`: reads `DATABASE_URL` once, exports the shared `pg.Pool`. This is the only module that reads `DATABASE_URL` — nothing else calls `process.env` for DB config (AD-7)
- [x] Task 2: Migration — create the `customers` table (AC: #1)
  - [x] One `node-pg-migrate` migration file under `migrations/` creating `customers` with: `id` (serial PK), `name` (text, not null), `telepules` (text, not null), `lat` (double precision, nullable), `lon` (double precision, nullable), `budget` (numeric(10,2), nullable), `note` (text, nullable)
  - [x] Add `UNIQUE (name, telepules)` constraint in the same migration — this is the sole idempotency mechanism (AD-4); do not add any application-level "does this row exist" check
- [x] Task 3: `src/lib/normalizeCity.js` — pure normalization function (AC: #2)
  - [x] Export a single function: lowercase, Unicode-normalize and strip diacritics (e.g. `"Kraków".normalize('NFD').replace(/[̀-ͯ]/g, '')` → `"krakow"`), trim whitespace
  - [x] Special-case: any input containing "budapest" (post-normalization, e.g. to also catch a district name if one ever appears) resolves to matching `reference/city-coordinates.json`'s `"budapest"` entry
  - [x] This is the ONLY place normalization logic lives — `src/services/seedService.js` calls it, nothing else re-implements it (AD-6)
  - [x] **Path note:** lives under `src/lib/`, not a top-level `lib/` — matches ARCHITECTURE-SPINE.md's Structural Seed exactly
- [x] Task 4: `src/services/seedService.js` + `scripts/seed.js` — the seed workflow (AC: #2, #3)
  - [x] Load `seed-customers.json` and `reference/city-coordinates.json` (both already exist at repo root — do not regenerate or modify them)
  - [x] For each seed customer: normalize `location.city` via `src/lib/normalizeCity.js` **for matching only** — the *normalized* value (e.g. `"krakow"`) is a lookup key, never what gets stored
  - [x] **`telepules` must be stored as the original, unnormalized `location.city` string** (e.g. `"Kraków"`, not `"krakow"`) — Story 1.3's response and its name/telepules display depend on the human-readable form, not the lookup key
  - [x] Look up the reference array by matching **both** `normalizedCity` AND `countryCode`. If `normalizedCity` matches but `countryCode` differs, treat as **no match** (`lat`/`lon = null`, log a warning) — this exact combination doesn't occur in the current 15-row dataset, but the matching logic must still enforce it since a future seed file could hit it
  - [x] Match found → set `lat`/`lon` from the reference entry. No match → `lat`/`lon = null`, `console.warn` with the customer's name/city, continue to the next customer (never throw)
  - [x] Insert via `INSERT ... ON CONFLICT (name, telepules) DO NOTHING` — do not pre-check existence in application code
  - [x] `scripts/seed.js` is the standalone entrypoint (`npm run seed`) that calls `seedService`; it must NOT be invoked from `src/server.js` (AD-2 — server never seeds on boot)
- [x] Task 5: Automated regression tests for AC #2 and #3 (uses `node:test`, per AD-8 — the runner is already established, don't defer these to manual-only checks)
  - [x] Test: running the seed logic twice against the same database yields the same row count (AC #3)
  - [x] Test: a customer whose city has no reference match ends up with `lat`/`lon = null` and does not throw (AC #2's miss path — not naturally exercised by the real 15-row dataset, see Dev Notes)
  - [x] Test: `src/lib/normalizeCity.js` normalizes `"Kraków"` → `"krakow"` (accent-stripping sanity check)

## Dev Notes

- **Architecture is fully fixed for this story** — read `__bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md` in full before starting. Relevant ADs: AD-1 (no ORM, raw `pg`), AD-2 (seed is a separate process), AD-3 (node-pg-migrate), AD-4 (DB-level idempotency), AD-6 (single normalization owner), AD-7 (single config module), AD-10 (offline-only — no HTTP client to any external service, no LLM SDK dependency, ever).
- **No existing code to preserve** — this is a from-scratch greenfield build; `git log` shows only planning/docs commits so far, no `src/`, `package.json`, or `node_modules` exist yet. There is nothing to avoid regressing.
- **Real seed data fully resolves against the reference file.** All 15 customers in `seed-customers.json` have a matching city in `reference/city-coordinates.json` — running the seed against the real data will **not** exercise the "unmatched city → null + warning" path (AC #2's third clause) or the Budapest-district special case (neither appears in this dataset). Both must still be implemented per SPEC's NFR and covered by Task 5's automated tests (not skipped just because the real run never hits them).
- **Known accent-normalization test case already in the real data:** `"Kraków"` (seed) must normalize to match `"krakow"` (reference's `normalizedCity`) for lookup purposes, but the stored `telepules` value stays `"Kraków"` (see Task 4's storage note). If this row ends up with `null` lat/lon after seeding, the normalization function has a bug.
- **`node-pg-migrate` exact version:** ARCHITECTURE-SPINE.md's Stack table flags a source disagreement (8.0.3 vs 8.0.4) from the 2026-07-14 verification pass — confirm the exact current patch on npmjs.com when running `npm install`, don't hardcode a guess. `node-pg-migrate` reads `DATABASE_URL` from the environment by default for its own CLI invocation (`npm run migrate`) — this is separate from, and doesn't need to reuse, `src/db/pool.js` (that module is for the app's runtime queries, not the migration tool's own connection).
- **Error/logging convention (from ARCHITECTURE-SPINE.md Consistency Conventions):** no logging library — use `console.warn`/`console.error` directly, matching the project's minimal-dependency stance.
- **Not required by this story, needed by later stories:** `src/server.js` (Express bootstrap) is NOT part of this story — Story 1.2 is the first to need a running server. Do not build it here; keep this story scoped to migration + seed only, per the "create tables/entities/files only when needed" principle.
- **README gap across the epic:** none of the 3 stories in Epic 1 currently owns writing the README that SPEC's NFR7 requires (covering start Postgres, migrate, seed, start server, run tests) — it can't be written correctly until Story 1.3 lands (the last piece, `npm test`, doesn't exist until then). Flagging here so it isn't lost: recommend it becomes an explicit task on Story 1.3, or a small follow-up after Epic 1 is otherwise done.

### Project Structure Notes

This story creates: `package.json`, `migrations/<timestamp>_create-customers-table.js` (use `npx node-pg-migrate create create-customers-table` to get node-pg-migrate's own timestamp-prefixed filename — don't hand-invent the name), `src/db/pool.js`, `src/lib/normalizeCity.js`, `src/services/seedService.js`, `scripts/seed.js`, plus `test/` files for Task 5. It does NOT create `src/server.js`, `src/routes/`, or `src/lib/haversine.js` — those belong to Stories 1.2 and 1.3. Every path in this story lives under `src/` per ARCHITECTURE-SPINE.md's Structural Seed (`src/lib/`, `src/services/`, `src/db/`) — there is no top-level `lib/` or `services/` directory anywhere in this project.

### References

- [Source: __bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md#Capabilities — CAP-1] (intent + success condition this story implements)
- [Source: __bmad-output/specs/spec-hf2-customer-distance-service/SPEC.md#Constraints] (NFR2, NFR3, NFR4 — table columns, normalization rules, missing-city handling)
- [Source: __bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md#Invariants--Rules — AD-1, AD-2, AD-3, AD-4, AD-6, AD-7, AD-10]
- [Source: __bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md#Structural-Seed] (directory layout, ERD column types)
- [Source: __bmad-output/planning-artifacts/epics.md#Epic-1-Customer-Distance-Query-Service — Story 1.1]
- [Source: reference/city-coordinates.json] (15 entries, all seed cities present; `normalizedCity` field is the pre-lowercased match key)
- [Source: seed-customers.json] (15 customers; every city in this file has a reference match — see Dev Notes)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (Claude Code)

### Debug Log References

- Discovered a pre-existing `hf2-postgres` Docker container (port 5434, db/user/pass `hf2`) holding a stale Prisma-based `customers` schema from 2026-07-13 (before this branch's BMad rebuild reset). Confirmed with the user and dropped `customers` + `_prisma_migrations` before migrating.
- `node-pg-migrate create` scaffolds ESM (`export const`) migration files by default regardless of `package.json`'s `"type": "commonjs"`; rewrote the generated migration to CommonJS (`exports.up`/`exports.down`) to match the rest of the codebase — no project-wide ESM/CJS decision was needed.
- Refactored `seedService.seed()` to extract a pure `buildCustomerRow(customer, referenceCities)` function so the "no reference match → null lat/lon, no throw" and "countryCode mismatch → no match" branches (Task 5) are unit-testable without a database, keeping only the idempotency check (AC #3, inherently DB-level) as an integration test against the real Postgres instance.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- All 3 ACs verified against the real 15-row `seed-customers.json` dataset: migration creates the exact column set + `UNIQUE (name, telepules)` constraint (AC #1); seed populates all 15 rows with lat/lon geocoded via `reference/city-coordinates.json`, including the accent-insensitive `"Kraków"` → `"krakow"` match (AC #2); running the seed twice leaves the row count at 15, enforced by the DB constraint + `ON CONFLICT DO NOTHING`, not application logic (AC #3)
- The real dataset never exercises the "unmatched city" or "Budapest district" branches (every seed city resolves cleanly) — both are covered instead by `test/seedService.test.js`'s synthetic-city unit tests, per the story's Dev Notes
- 8/8 automated tests pass (`node --test`): 3 `normalizeCity` cases, 4 `buildCustomerRow` cases (match, no-match, countryCode-mismatch, telepules-preserves-original-string), 1 seed-idempotency integration case against the live Postgres instance
- `node-pg-migrate`'s exact patch version was confirmed as `8.0.4` via `npm view node-pg-migrate version` at install time (resolves the source disagreement flagged in ARCHITECTURE-SPINE.md's Stack table)

### File List

- `package.json` (new)
- `package-lock.json` (new)
- `.env` (new — gitignored, not committed; contains local `DATABASE_URL=postgres://hf2:hf2@localhost:5434/hf2` for this dev environment's existing Postgres container)
- `migrations/1784061008370_create-customers-table.js` (new)
- `src/db/pool.js` (new)
- `src/lib/normalizeCity.js` (new)
- `src/services/seedService.js` (new)
- `scripts/seed.js` (new)
- `test/normalizeCity.test.js` (new)
- `test/seedService.test.js` (new)
- `test/seedIdempotency.test.js` (new)

## Change Log

- 2026-07-14: Implemented Story 1.1 end-to-end (scaffold, migration, normalization, seed workflow, tests). All 3 ACs satisfied and verified against the live Postgres instance; 8/8 automated tests passing. Status moved to `review`.
