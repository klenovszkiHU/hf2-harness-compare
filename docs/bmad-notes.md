# BMad munkanapló

Rövid, lépésenkénti bejegyzések a BMad-folyamat során hozott kérdésekről, döntésekről és generált dokumentumokról.

## bmad-spec — SPEC.md létrehozása (2026-07-14)

A `HF2_SPEC.md` forrásdokumentumot desztillálta a szkill a kanonikus `SPEC-hf2-customer-distance-service/SPEC.md` kontraktussá (3 capability, 7 constraint, 5 non-goal, 1 success signal). Nem tett fel kérdést a felhasználónak (önálló desztilláció), viszont egy meglepő, korrekciót igénylő pontot talált: a forrás minimum-oszloplistája nem tartalmazta a `name` mezőt, miközben a CAP-3 név szerinti holtverseny-feloldása megköveteli — ezt asszumpcióként rögzítette és a `customers` tábla oszloplistájába emelte. Két önellenőrző kör (koherencia, majd forrás-lefedettség) futott le hiba nélkül.

## bmad-architecture — ARCHITECTURE-SPINE.md létrehozása (2026-07-14)

Coaching-módban 7 kérdést tett fel a felhasználónak (munkamód, deliverable-kör, stack, seed/API folyamathatár, migrációs eszköz, tesztfuttató, idempotencia-mechanizmus) — mindegyikre az ajánlott opció lett elfogadva, korrekció nem történt. A végeredmény 10 architektúra-döntés (AD-1–AD-10), verifikált verziószámokkal (Node 24, Express 5.2.1, pg 8.22.0, node-pg-migrate 8.0.x). Négy párhuzamos szubágens-review (SPEC-egyeztetés, rubrika, verzióellenőrzés, adverzariális divergencia-teszt) két új, korábban hiányzó szabályt hozott felszínre — a válasz JSON-formák pontos rögzítése (AD-9) és az offline-only kényszer függőségi szinten való kikényszerítése (AD-10) —, amelyeket a véglegesítés előtt beépített a spine-ba.
