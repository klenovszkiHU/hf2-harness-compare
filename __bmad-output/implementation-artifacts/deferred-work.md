# Deferred Work

## Deferred from: code review of 1-1-idempotent-customer-seed-geocoding (2026-07-14)

- Test isolation — `test/seedIdempotency.test.js` runs against the live dev Postgres instance with no dedicated test DB or fixture teardown. No test-DB strategy was specified in SPEC/ARCHITECTURE-SPINE for this benchmark-scale project, and `ON CONFLICT DO NOTHING` makes repeated runs non-destructive.
- A duplicate `(name, telepules)` pair within `seed-customers.json` would silently drop the second row's `budget`/`note` via `ON CONFLICT DO NOTHING`. Inherent to AD-4's chosen idempotency mechanism; not reachable with the current 15-row dataset (verified no duplicates).
- A reference-file entry with a duplicate `(normalizedCity, countryCode)` pair would resolve non-deterministically to the first match in `reference/city-coordinates.json`. A data-integrity assumption on that file, out of this story's scope; not reachable with current data (verified unique).
- `seedService.seed()` has no per-row error handling or transaction — a mid-loop query failure would leave partial state. No AC requires transactional atomicity for a 15-row static seed; adding it now would be scope creep.

## Deferred from: code review of 1-2-customer-count-endpoint (2026-07-15)

- Testing the empty-table case (AC #4) at the HTTP/integration layer would require either a committed truncate+reseed (reintroducing the exact test-isolation race risk the transactional service-layer test was built to avoid) or adding query-injection to the route layer (unwarranted scope for this story).
- `src/server.js`'s `app.listen()` has no `.on('error', ...)` handler for a port-already-in-use failure. No AC requires graceful port-conflict handling for this single-instance benchmark service.
- `customerService.count()`'s `Number(...)` coercion has no guard against exceeding `Number.MAX_SAFE_INTEGER`. Unreachable at realistic table sizes — same reasoning already applied to the `budget` numeric precision deferral in Story 1.1.

## Deferred from: code review of 1-3-customers-ranked-by-distance-endpoint (2026-07-15)

- AC #7 (empty table → `[]`) is only tested at the service layer, not through the actual `GET /customers/by-distance` HTTP route. Testing this at the HTTP layer would require either a committed truncate+reseed (reintroducing the test-isolation race risk) or route-level query injection (unwarranted scope) — same precedent as Story 1.2's equivalent empty-table deferral.
- SPEC's "small, focused commits" delivery constraint was not honored literally across any of the 3 implementation stories (each landed as one commit). Already acknowledged as a delivery-process characteristic in ARCHITECTURE-SPINE.md's own Deferred section, not something a code patch fixes.
- No pagination, response envelope, or DB-pushed-down ranking (e.g. Postgres `earthdistance`) for `/customers/by-distance`. Explicit architecture decisions (AD-1 no ORM/raw SQL, AD-5 haversine computed in JS) and no SPEC requirement for pagination at this scale (15 rows).
