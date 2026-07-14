# Review — ARCHITECTURE-SPINE.md vs. checklist

**Target:** `architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md`
**Companion:** `specs/spec-hf2-customer-distance-service/SPEC.md`
**Reviewed:** 2026-07-14

## Verdict

Solid, tightly-scoped spine. All 8 ADs are enforceable and each maps to a genuine divergence risk from the SPEC; the stack versions are current as of today; the mermaid diagrams are syntactically valid; the paradigm is coherent and matches the structural seed and capability map 1:1. Two small silent gaps found (server port/env-var ownership, npm script naming beyond `seed`) — neither is severe enough to block, both are cheap one-line fixes.

---

## 1. Divergence points for the level below

Checked each AD against "what would two independent builders plausibly do differently given only the SPEC":

| AD | Divergence it targets | Real risk? |
| --- | --- | --- |
| AD-1 (pg, no ORM) | ORM vs raw SQL, different query builders | Yes — SPEC is silent on this, genuine fork point |
| AD-2 (seed is separate process) | Seed-on-boot vs standalone script | Yes — affects server startup semantics and idempotency-check placement |
| AD-3 (node-pg-migrate) | Ad-hoc DDL vs a migration tool, or a different migration tool | Yes |
| AD-4 (DB-level idempotency) | Check-then-insert app logic vs DB constraint | Yes — this is the correct fix; app-level idempotency is fragile under concurrent/repeated runs and refactors |
| AD-5 (pure haversine) | Inlined calculation vs importable pure function | Yes — directly required by the SPEC's unit-test constraint |
| AD-6 (single normalizeCity owner) | Two normalization implementations if geocoding is touched twice | Yes |
| AD-7 (one config module for DATABASE_URL) | Seed and server each inventing env var names | Yes |
| AD-8 (node:test) | Test framework choice (Jest/Mocha/Vitest) | Yes — minor but real, avoids an unnecessary dependency fork |

The Consistency Conventions table also correctly locks down a divergence the AD list doesn't cover: response shape (bare array vs enveloped, `distanceKm` as number vs string, `null` handling). This is a real fork point the SPEC's prose doesn't fully pin down (SPEC says "each element has distanceKm" but not "no envelope") — good catch, correctly placed as a convention rather than a full AD since it's a formatting rule, not an architectural choice.

**Gaps found (see also section 4):**

- **Server port / listen config has no owner.** AD-7 fixes *only* the DB connection string ownership (`src/db/pool.js` / `DATABASE_URL`). Nothing in the spine says what env var (if any) controls the HTTP port, or what the default port is. Two builders (or the seed/README-writing pass vs. the server-writing pass) could pick different ports, which would make the documented curl command sequence in the README inconsistent with what `server.js` actually listens on. This is a small but genuine hole in an otherwise complete "who owns configuration" story — AD-7 should either extend to cover `PORT` or a sibling rule should assign it.
- **npm script names beyond `seed` aren't fixed.** AD-2 pins `npm run seed`. Nothing pins the migrate command (`npm run migrate` vs `npx node-pg-migrate up` vs something else) or a `npm start`/`npm run dev` convention for the server. Since the SPEC's success signal is literally "a single documented command sequence," and the README is one of the SPEC's required deliverables, leaving script names unfixed risks a README that doesn't match what a differently-named-script builder actually wired up. Low severity (single build, so internally self-consistent either way), but worth a one-line addition to the Structural Seed's `package.json` (implied but not shown) or a ninth AD/convention row.

Neither gap is severe — both are one-line additions, not structural problems — but both are dimensions the spine visibly owns elsewhere (AD-7 for DB config, AD-2 for the seed script name) and left asymmetrically unfinished for the sibling concern (server port, other scripts).

## 2. Are the ADs enforceable and do they actually prevent the stated divergence?

Yes for all 8, with notes:

- **AD-1, AD-3, AD-8** are mechanically enforceable by inspecting `package.json` dependencies (no ORM, no test-framework dep) — trivial to check, cannot be silently violated by accretion.
- **AD-4** is enforced by the database itself (`UNIQUE` constraint + `ON CONFLICT DO NOTHING`), which is the strongest possible enforcement — independent of how the seed script's own logic evolves. Correctly identified in the AD's own "Prevents" rationale.
- **AD-5, AD-6, AD-7** are enforceable by code review / import-graph inspection (does `lib/haversine.js` import anything beyond stdlib; does anything besides `seedService.js` import `normalizeCity`; does anything besides `pool.js` read `process.env` for DB config). These aren't automatically lint-enforced, but they're unambiguous rules a reviewer or a static import-check script can verify — acceptable given this is a small, single-build service, not a multi-team monorepo needing CI-enforced boundaries.
- **AD-2** ("the server never seeds on boot and has no code path that writes to `customers`") is the softest of the eight — it's a negative claim about the *absence* of a code path, which is harder to verify by inspection than the others. Still checkable (grep `server.js` and its transitive imports for any `INSERT`/`UPDATE`/`DELETE` or `seedService` import), so it clears the enforceability bar, just barely.

No AD is toothless or redundant with another.

## 3. Deferred section — could anything there let two units diverge in a way that matters?

Reviewed each deferred item against the SPEC's actual success signal:

- **Auth/authz** — correctly deferred; SPEC states it's an explicit non-goal.
- **API framework upgrade path/versioning** — correctly deferred; this is a fixed one-shot benchmark service, not a service with a future roadmap.
- **Connection pooling tuning, retry/backoff** — correctly deferred; `pg.Pool` defaults are a single, shared behavior via AD-7's shared pool module, so there's no divergence risk even without tuning — both consumers get identical (default) behavior for free.
- **Postgres MCP wiring** — correctly deferred; SPEC explicitly marks it optional/environment-conditional.
- **Deployment/environment topology** — explicitly addressed (not silently dropped): the spine gives the reasoning ("SPEC's success signal is a local documented command sequence... no deployment target is specified") tied directly back to the SPEC's success criterion. This satisfies the "decided, deferred, or open question" bar — it is deferred *with justification*, not left silent. Correctly scoped: a fixed local benchmark task has no deployment dimension to decide.

No deferred item hides a divergence that would actually bite CAP-1/2/3. The two gaps flagged in section 1 (port, script names) are omissions, not misplaced deferrals — they aren't listed in Deferred at all, they're simply absent from both the ADs and the Deferred list.

## 4. Named tech — version currency check (spot-checked 2026-07-14 via live web search)

| Claimed | Verified | Result |
| --- | --- | --- |
| Node.js 24 (current LTS) | Node.js 24 entered LTS in 2026 (per NodeSource/nodejs.org reporting), active LTS as of mid-2026, supported through ~April 2028 | Accurate |
| Express 5.2.1 | Confirmed as latest npm release, published within the last ~7 months of 2026-07-14; Express 5.2 is the Technical Committee's endorsed production release | Accurate |
| pg (node-postgres) 8.22.0 | Confirmed as latest npm release (published ~25 days prior to check date); compatible with Node 18/20/22/24 | Accurate |
| node-pg-migrate 8.0.4 | Confirmed as latest npm release (published ~7 months prior to check date) | Accurate |

All four version claims check out — nothing stale or wrong. This is a well-maintained spine on the "verified-current" front; the 2026-07-14 dating is credible.

## 5. Whole-dimension silence check (deployment/environments, infra/provider, operations)

- **Deployment/environments** — addressed via Deferred with justification (see section 3). Not silent.
- **Infra/provider strategy** — not applicable at this altitude; SPEC has no cloud/infra requirement (local Postgres only), and the spine correctly doesn't invent one.
- **Operations (logging, error handling)** — decided in the Consistency Conventions table: `console.warn`/`console.error`, no logging library, city-match miss logs+continues, DB/startup failure → 500 + logged stack trtrace. This is a real decision, not silence.
- **Configuration/environment variables** — *partially* silent: DB connection is fully owned (AD-7), but HTTP port is not (see section 1 gap). This is the one place where the "every dimension decided/deferred/open" bar is not fully met — it's neither decided, deferred, nor flagged as an open question; it's simply absent.

## 6. Paradigm and diagram validity

- **Paradigm** (layered routes → services → db, with a pure `lib/` importable from services and tests) is coherent: it matches the Structural Seed 1:1 (routes/, services/, db/, lib/ all present as described), matches the Capability → Architecture Map (each capability's "Lives in" column stays inside the layer boundaries the paradigm defines), and doesn't contradict any AD.
- **Mermaid diagram 1** (`graph LR` layer flow): valid syntax — chained edges (`routes --> services --> db`), a labeled node (`seedScript["scripts/seed.js"]`), and a second edge from the same node (`seedScript --> db`) are all standard flowchart constructs. Renders correctly.
- **Mermaid diagram 2** (`erDiagram` for `customers`): valid syntax — a single entity block with typed attributes and quoted attribute comments (`"nullable"`, `"optional"`) is accepted mermaid ER syntax even with no relationship lines (only one entity exists, so no relationship is expected). Renders correctly.

No diagram or paradigm issues found.

---

## Summary of findings

1. **(Minor) HTTP server port/listen config has no assigned owner.** AD-7 covers only `DATABASE_URL`; nothing fixes the port env var or default, unlike the DB-connection case it's modeled on. Risks a README/server.js mismatch against the SPEC's curl-demonstrable success signal.
2. **(Minor) npm script names beyond `npm run seed` aren't fixed.** Migrate and start/dev commands are implied but not pinned anywhere in the ADs or Structural Seed, despite the SPEC requiring a single documented command sequence as its success signal.
3. **(Informational, not a defect)** Both gaps are additive one-liners, not structural rework — e.g., extend AD-7's rule to "…and the `PORT` env var (default 3000)" and add one line to the Structural Seed noting `package.json` script names (`seed`, `migrate`, `start`).

Everything else checked — AD enforceability, Deferred completeness, version currency, paradigm/diagram validity, dimension coverage — passed cleanly.
