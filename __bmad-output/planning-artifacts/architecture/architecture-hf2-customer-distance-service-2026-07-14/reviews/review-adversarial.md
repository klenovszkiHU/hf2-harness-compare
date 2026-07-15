---
name: 'Adversarial Review — HF2 Customer Distance REST Service Architecture Spine'
type: review
reviewed: '__bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md'
method: 'two-independent-builders divergence hunt'
date: '2026-07-14'
---

# Adversarial Review — Two-Builder Divergence Test

**Method:** Assume Dev A and Dev B (or two AI coding agents) each read only this spine (plus the bound SPEC) and independently implement the service, each following every AD's Rule to the letter. Where would their code disagree in a way that breaks interop (API shape, DB shape, ownership, or control flow) even though neither violated any AD?

**Verdict: the spine is directionally solid on ownership/layering but leaves at least one contract-breaking gap (the `/customers/by-distance` object shape) and one landmine baked into the chosen stack (`pg` bigint/numeric string coercion) that no AD addresses. Both would produce two working-but-API-incompatible servers.**

---

## Finding 1 — `/customers/by-distance` per-item JSON shape is never fully specified (HIGH)

**AD/section implicated:** Consistency Conventions → "Data & formats" row; ER diagram; Capability Map (CAP-3).

The spine nails down the *envelope* ("bare array, no wrapper") and one field's type (`distanceKm`, number|null, 1 decimal). It never states which of the `customers` columns appear in each array element, nor their JSON key names/casing. The ER diagram lists `id, name, telepules, lat, lon, budget, note` as DB columns, but nothing says the response echoes all of them, a subset, or renamed keys.

**Concrete divergence:**
- Dev A returns the raw row shape: `{ id, name, telepules, lat, lon, budget, note, distanceKm }` (column names passed straight through, snake_case `telepules` intact).
- Dev B, reading "REST API" and Node convention, camelCases and renames for readability: `{ id, name, city, latitude, longitude, distanceKm }`, dropping `budget`/`note` as "internal."

Both fully satisfy every AD (paradigm, AD-1, AD-5, AD-7) and the one stated format rule (`distanceKm` numeric/null). Neither is wrong per the spine. A client built against one payload breaks against the other. This is exactly the kind of "shared data shape" gap the spine's job is to close, and it doesn't.

**Fix:** Add a Rule (or extend the Consistency Conventions row) that pins the exact per-item key list and casing for `/customers/by-distance`, ideally by reference to a concrete example object, not just the one field it already calls out.

---

## Finding 2 — `pg` returns `COUNT(*)` and `NUMERIC` columns as strings; no AD or convention addresses it (HIGH)

**AD/section implicated:** AD-1 (raw `pg`, no ORM); Consistency Conventions → "Data & formats" ("never a string" — but only stated for `distanceKm`).

`node-postgres` (pinned at 8.22.0) returns `bigint`/`COUNT(*)` results and `NUMERIC` column values as **JS strings**, not numbers, unless the caller explicitly parses or registers a type parser. AD-1 forecloses an ORM (which would normally normalize this), but no Rule anywhere requires explicit numeric coercion at the `db/`→`services/` boundary.

**Concrete divergence:**
- Dev A writes `SELECT COUNT(*) FROM customers` and returns `{ count: result.rows[0].count }` straight through → response body is `{"count":"1000"}` (string).
- Dev B, aware of the pg quirk, writes `{ count: parseInt(result.rows[0].count, 10) }` → `{"count":1000}` (number).

The spine's own SPEC-matching claim ("matches SPEC's exact shapes: `{"count": N}`") implies a number, but nothing in the spine's Rules forces either developer toward that outcome — it's tribal `pg` knowledge, not something an AD encodes. Same risk exists for `lat`/`lon`/`budget` (all `numeric` in the ERD) flowing into `haversine.js` or the response body as strings vs. floats. JS's implicit coercion papers over it inside `Math.*` calls, but not when the value is serialized directly into a JSON response field that's supposed to be numeric.

**Fix:** Add an explicit Rule (or fold into AD-1 or AD-7) that all `pg` numeric/bigint results crossing the `db/`→`services/` boundary are coerced to JS `Number` before use, e.g. "no raw `pg` row value is passed to a response body or `lib/` function without explicit numeric coercion."

---

## Finding 3 — Haversine's contract for null coordinates is a test obligation, not a function contract (MEDIUM)

**AD/section implicated:** AD-5.

AD-5 fixes the *signature* — `(lat1, lon1, lat2, lon2) => km` — and mandates a unit test for "null-coordinate handling," but never states what the function returns/does when a coordinate is null. `=> km` reads as always-a-number.

**Concrete divergence:**
- Dev A: `haversine` returns `null` when any input is null (so the test asserts `=== null`).
- Dev B: `haversine` returns `NaN` (still technically "a km value," just non-finite; test asserts `Number.isNaN(...)`).
- Dev C-flavored agent: `haversine` throws on null, and the "null-coordinate handling" test asserts it throws; `customerService` then wraps every call in try/catch to produce the `distanceKm: null` promised by the Consistency Conventions table.

All three pass "a unit test for null-coordinate handling" per AD-5's letter. But `services/customerService.js`'s logic for turning a haversine result into the response's `distanceKm` (`number | null`) differs completely depending on which contract the other dev assumed — try/catch vs. `=== null` check vs. `Number.isNaN` check. Since `lib/` and `services/` are typically built by different people/passes even on one team, this is a real seam.

**Fix:** State the null-input contract explicitly in AD-5's Rule, e.g. "returns `null` (not `NaN`, not a throw) when any coordinate argument is `null`/`undefined`."

---

## Finding 4 — "no bespoke error envelope" is compatible with two different HTTP failure bodies (MEDIUM)

**AD/section implicated:** Consistency Conventions → "Errors" row.

The rule: "A DB or startup failure in the server exits/responds with a 500 and a logged stack trace; there is no bespoke error envelope since no capability requires one." This forecloses a `{error: {...}}`-style wrapper but doesn't say what the 500 response body actually *is*.

**Concrete divergence:**
- Dev A lets the error propagate to Express's default error handler → in production this sends a minimal plain-text/HTML body (Express's built-in behavior, not JSON) with status 500.
- Dev B explicitly catches at the route layer and does `res.status(500).json({ message: err.message })` — still "no envelope" in the sense of no `{success, data}` wrapper, but now the body is JSON, not Express's default.

Both are defensible readings of "no bespoke error envelope." A test or a client checking `response.headers['content-type']` or attempting `response.json()` on a 500 will behave differently depending on which dev built it — and since AD-1 forbids extra dependencies, neither is "obviously wrong" by elimination.

**Fix:** State whether the 500 body is JSON (and if so, its exact minimal shape, even if it's just `{}`  or plain text) versus explicitly "Express's default handler, unmodified" — pick one and say so.

---

## Finding 5 — `numeric` column precision for `lat`/`lon`/`budget` is unspecified in the ERD (LOW)

**AD/section implicated:** Structural Seed ER diagram; AD-3 (migrations are the schema source of truth).

The ERD lists `lat`, `lon`, `budget` as `numeric` with no precision/scale (e.g., `NUMERIC(9,6)` vs `NUMERIC(10,7)` vs unconstrained `NUMERIC`). AD-3 says migrations are the source of truth, but the spine gives the migration author no scale to encode.

**Concrete divergence:** Dev A writes `lat NUMERIC(9,6)`, Dev B writes unconstrained `NUMERIC`. Both pass AD-3/AD-4. Functionally near-identical for this dataset, but it's still an independently-chosen DDL detail with no anchor in the spine — the kind of drift AD-3 exists specifically to prevent between environments, yet the spine doesn't supply the number.

**Fix:** Low priority given the dataset is small/bounded and unlikely to hit precision issues in practice — flagged for completeness rather than urgency.

---

## Summary Table

| # | Severity | AD/section | Divergence |
| --- | --- | --- | --- |
| 1 | HIGH | Consistency Conventions / CAP-3 | `/customers/by-distance` item shape (field set + casing) unspecified — two incompatible response bodies both pass every AD |
| 2 | HIGH | AD-1 / Consistency Conventions | `pg` returns `COUNT`/`NUMERIC` as strings; no Rule forces coercion → `{"count":"1000"}` vs `{"count":1000}` |
| 3 | MEDIUM | AD-5 | Haversine's null-input behavior (return `null` vs `NaN` vs throw) unspecified — three valid implementations imply three different `customerService` designs |
| 4 | MEDIUM | Consistency Conventions (Errors) | "No bespoke envelope" is compatible with Express-default vs. explicit-JSON 500 bodies |
| 5 | LOW | ER diagram / AD-3 | `numeric` columns lack precision/scale, leaving DDL detail to each migration author |

**Not a finding, but worth noting for scope:** the spine correctly and unambiguously locks down layering (AD-1/paradigm), the seed/server process split (AD-2), idempotency as a DB constraint (AD-4), normalization ownership (AD-6), and connection-string ownership (AD-7) — no divergence scenario was found against those four; they read as genuinely load-bearing and precise.
