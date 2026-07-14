# Review — Version & Practice Verification of ARCHITECTURE-SPINE.md

**Reviewed artifact:** `__bmad-output/planning-artifacts/architecture/architecture-hf2-customer-distance-service-2026-07-14/ARCHITECTURE-SPINE.md`
**Review date:** 2026-07-14
**Method:** WebSearch spot-checks against the spine's named versions and technology choices. Findings below are ranked by what changes the recommendation vs. what's just a caveat on source quality.

## Verdict

All four pinned versions check out as real, current, and plausible as of July 2026; the four architectural stances (no ORM, `node:test`, `node-pg-migrate`, DB-level UNIQUE for idempotency) remain sound current practice for this specific scope (small, offline, dependency-averse Node+Postgres service). No version or decision needs to change. The main residual risk is source quality, not correctness — several of the confirming sources are AI-generated SEO aggregator sites rather than official registries, so a human should do a 30-second direct check on npmjs.com/nodejs.org before this is locked as final.

## Version claims

| Claim in spine | Status | Evidence | Confidence |
| --- | --- | --- | --- |
| Node.js 24 (current LTS) | **Confirmed** | Node 24 ("Krypton") entered Active LTS around Oct 2025; nodejs.org and NodeSource blog both list 24.x as the current LTS line in mid-2026 (24.16–24.18 seen), supported into 2028. | High — corroborated by nodejs.org and NodeSource, both primary/near-primary sources. |
| Express 5.2.1 | **Confirmed** | GitHub release tag `v5.2.1` exists (expressjs/express); npm/jsDocs.io list it as latest. Context: 5.2.0 had a query-parser regression that 5.2.1 reverted — consistent, coherent story, not a hallucinated version. | High — GitHub release tag is a primary source. |
| pg (node-postgres) 8.22.0 | **Confirmed** | npmjs.com page and node-postgres changelog context place 8.22.0 as a recent release (~a few weeks before the review date). | Medium-high — npmjs.com is primary, but I did not open the changelog directly to confirm the exact version delta. |
| node-pg-migrate 8.0.4 | **Confirmed, with one caveat** | SourceForge mirror explicitly lists a `v8.0.4` directory, and one aggregator confirms 8.0.4 as latest (security bump to the `glob` dependency). A second search pass, however, had one AI-summarized source claim the latest is "8.0.3" — a direct contradiction. | Medium — conflicting secondary sources. **Recommend a human open npmjs.com/package/node-pg-migrate directly** to confirm 8.0.4 vs 8.0.3 before treating the pin as final. |

**Source-quality flag (applies to all four rows):** several of the pages WebSearch surfaced (pkgpulse.com, versionlog.com, us-content-hub.vercel.app, generalistprogrammer.com) read as programmatically generated SEO/aggregator content rather than official docs. They were directionally consistent with primary sources (nodejs.org, github.com releases, npmjs.com, sourceforge.net) in three of four cases, but the node-pg-migrate contradiction above shows they aren't fully reliable on their own. Treat this file's version confirmations as "spot-checked, still worth a final manual npm/nodejs.org glance" rather than "fully audited."

## Architectural decision spot-checks

### AD-1 — No ORM, raw SQL via `pg`
Still standard practice for a small, fixed-scope service with two read queries and one write path. 2026 discourse (Drizzle vs. Knex comparisons) is about TypeScript-first application stacks choosing a query builder/light-ORM; it doesn't argue against hand-written SQL for a minimal, non-evolving benchmark service. The spine's own reasoning ("prevents two units picking incompatible query layers") is sound and doesn't depend on which year it is. **No change needed.**

### AD-3 — Migrations via `node-pg-migrate`
Confirmed actively maintained (current maintainer @Shinigami92 under Salsita Software; ~135k weekly downloads per npm trends), Postgres-specific, requires Node ≥20.11 and Postgres ≥13 — both satisfied by the spine's Node 24 / Postgres 16+ stack. The 2026 trend line is toward Drizzle Kit/Prisma Migrate for TypeScript-first teams, but since AD-1 explicitly rules out an ORM, `node-pg-migrate` remains the correctly-scoped, lighter-weight tool for this project. **No change needed.**

### AD-8 — `node:test` built-in runner
This is the one place where 2026 industry commentary has shifted somewhat: multiple 2026 sources frame Vitest as the default recommendation for *new projects generally*, citing watch mode, snapshot testing, and DX. However, the same sources carve out an explicit exception for "Node.js libraries/CLI tools where adding a test dependency burdens consumers" — which is exactly this service's situation (3 required unit tests, zero-dependency stance already adopted elsewhere in the spine). AD-8's own stated rationale ("no test-framework dependency for what the spec requires as 3 unit tests") matches that carve-out precisely. **Still defensible, no change needed** — but flag to the team that this is a deliberate trade-off against the more common 2026 default, not an oversight.

### AD-4 — DB-level UNIQUE constraint + `ON CONFLICT ... DO NOTHING` for idempotency
This is timeless relational-database practice, not something that goes stale with library versions — a UNIQUE constraint plus `ON CONFLICT DO NOTHING` is still the textbook-correct way to make an insert idempotent under concurrent/re-run conditions, precisely because it moves the guarantee into the database's own constraint enforcement rather than application check-then-insert logic (which is race-prone). I did not find (or expect to find) any 2026 development that changes this recommendation. **No change needed**, and no meaningful web-research signal exists to falsify or confirm it beyond restating the general principle — this is a case where the spine's own reasoning is the whole argument.

## Summary of residual risk

1. **node-pg-migrate 8.0.4 vs 8.0.3** — conflicting secondary sources; verify directly on npmjs.com before treating as locked.
2. **Source quality** — several confirming sources for the version table are AI-content-farm style aggregators, not official registries; the numbers were consistent with primary sources but weren't independently re-derived from npmjs.com/github.com for pg and Node.js in this pass.
3. **AD-8 is a deliberate minority choice in 2026**, not the "default" test runner recommendation anymore — worth one line of visibility to the team/stakeholder, though the spine's own justification for it still holds for this specific scope.

None of the above are severe enough to warrant reopening any ADOPTED decision; they're flagged as "verify directly, then done" items for a human before final sign-off, per the human-in-the-loop principle for technical decisions.
