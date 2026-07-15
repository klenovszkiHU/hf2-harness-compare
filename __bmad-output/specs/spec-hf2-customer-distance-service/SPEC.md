---
id: SPEC-hf2-customer-distance-service
companions: []
sources: [../../../HF2_SPEC.md]
---

> **Canonical contract.** This SPEC is the complete, preservation-validated contract for what to build, test, and validate. The source document listed in frontmatter is for traceability only.

# HF2 Customer Distance REST Service

## Why

Mandate: this is a fixed benchmark task used to compare agentic development harnesses/workflows against one identical set of requirements. It is not solving an end-user pain or capturing a market opportunity — the spec itself is the deliverable being held constant across comparisons, so every capability and constraint below must be met exactly as stated for the comparison to be valid.

## Capabilities

- **CAP-1**
  - **intent:** System loads `seed-customers.json` into a `customers` table and geocodes each customer's city via the bundled `reference/city-coordinates.json`, re-running without duplicating rows.
  - **success:** Running the seed twice yields the same row count as running it once; every row's `lat`/`lon` is populated when its (city, countryCode) matches the reference (case/accent/whitespace-insensitive), or is `null` with a logged warning when it doesn't — and the seed never crashes on a miss.

- **CAP-2**
  - **intent:** A client can call `GET /customers/count` to get the total seeded customer count.
  - **success:** Response body is exactly `{"count": N}` where N equals the live row count in the `customers` table.

- **CAP-3**
  - **intent:** A client can call `GET /customers/by-distance` to get all customers ordered by ascending distance to Budapest, each annotated with `distanceKm`.
  - **success:** Every element has `distanceKm` rounded to 1 decimal; order is ascending by `distanceKm`; Budapest customers show `0` and sort first; customers with unknown coordinates sort last with `distanceKm: null`; ties break by `name` ascending.

## Constraints

- Offline only: no external geocoding API call and no LLM call at runtime, for seeding or serving.
- `customers` table minimum columns: `id`, `name`, `telepules`, `lat` (nullable), `lon` (nullable); `budget` and `note` may also be stored but are not required. (`name` is required despite the source's minimum-column list omitting it — CAP-3's tie-break depends on it; see Assumptions.)
- City-name matching for geocoding must be accent-insensitive, case-insensitive, and whitespace-trimmed; "Budapest" (optionally its districts) resolves to the capital's coordinates.
- A city absent from the reference file is not an error: store `lat`/`lon` as `null`, log it, continue seeding the rest.
- Haversine distance calculation needs dedicated unit tests covering: a known real distance (Budapest–Vienna, ≈214 km), the 0 km self-distance case, and null-coordinate handling.
- Delivery must land as small, focused commits so the build process itself is inspectable.
- A README must cover: starting Postgres, running the migration, seeding, starting the server, and running the tests.

## Non-goals

- No authentication/authorization on any endpoint.
- No write endpoints beyond the seed process itself (no create/update/delete customer API).
- No frontend/UI.
- No external geocoding API integration.
- No LLM calls at runtime.

## Success signal

A single documented command sequence (start Postgres, migrate, seed, start server) yields a running service where `GET /customers/count` returns `15` and `GET /customers/by-distance` returns all 15 customers correctly ordered and annotated — demonstrable via curl — plus the three required haversine unit tests passing.

## Assumptions

- Postgres MCP wiring for development-time schema/data visibility is optional per the source spec ("if a tool for it is available") and is not a required deliverable; omitted unless the environment already provides it.
- The `customers` table stores a `name` column despite the source's minimum-column list omitting it, because CAP-3's by-distance tie-break explicitly requires sorting by name — the two parts of the source are inconsistent on this point, and name-storage is the only reading that satisfies both.
