# BMad munkanapló

Rövid, lépésenkénti bejegyzések a BMad-folyamat során hozott kérdésekről, döntésekről és generált dokumentumokról.

## bmad-spec — SPEC.md létrehozása (2026-07-14)

A `HF2_SPEC.md` forrásdokumentumot desztillálta a szkill a kanonikus `SPEC-hf2-customer-distance-service/SPEC.md` kontraktussá (3 capability, 7 constraint, 5 non-goal, 1 success signal). Nem tett fel kérdést a felhasználónak (önálló desztilláció), viszont egy meglepő, korrekciót igénylő pontot talált: a forrás minimum-oszloplistája nem tartalmazta a `name` mezőt, miközben a CAP-3 név szerinti holtverseny-feloldása megköveteli — ezt asszumpcióként rögzítette és a `customers` tábla oszloplistájába emelte. Két önellenőrző kör (koherencia, majd forrás-lefedettség) futott le hiba nélkül.

## bmad-architecture — ARCHITECTURE-SPINE.md létrehozása (2026-07-14)

Coaching-módban 7 kérdést tett fel a felhasználónak (munkamód, deliverable-kör, stack, seed/API folyamathatár, migrációs eszköz, tesztfuttató, idempotencia-mechanizmus) — mindegyikre az ajánlott opció lett elfogadva, korrekció nem történt. A végeredmény 10 architektúra-döntés (AD-1–AD-10), verifikált verziószámokkal (Node 24, Express 5.2.1, pg 8.22.0, node-pg-migrate 8.0.x). Négy párhuzamos szubágens-review (SPEC-egyeztetés, rubrika, verzióellenőrzés, adverzariális divergencia-teszt) két új, korábban hiányzó szabályt hozott felszínre — a válasz JSON-formák pontos rögzítése (AD-9) és az offline-only kényszer függőségi szinten való kikényszerítése (AD-10) —, amelyeket a véglegesítés előtt beépített a spine-ba.

## bmad-create-epics-and-stories — epics.md létrehozása (2026-07-14)

Mivel a projekt SPEC.md-t használt PRD.md helyett, a szkill első lépése ezt a helyettesítést kérte megerősíteni a felhasználótól — ez volt az egyetlen igazi "korrekciós pont", utána minden a vártnak megfelelően ment. Összesen 3 kérdést tett fel (bemenet-megerősítés, epic-struktúra jóváhagyása, story-k jóváhagyása), mindegyikre az ajánlott választ kapta. A 3 SPEC capability-t egyetlen epicbe vonta össze (nem bontotta technikai rétegek szerint), amit a felhasználó jóváhagyott; ebből 3 story lett (seed+geokódolás, count endpoint, by-distance endpoint), szigorúan függőségmentes sorrendben. A végső validáció (FR-lefedettség, story-méret, függőségek) hibátlanul lement.

## bmad-check-implementation-readiness — readiness riport (2026-07-14)

Csak 1 kérdést tett fel (a SPEC.md/PRD-helyettesítés megerősítése, ugyanaz a mintázat, mint az epics-lépésnél), korrekció nem történt. A 6 lépéses autonóm ellenőrzés (dokumentum-felfedezés, PRD/SPEC-elemzés, epic-lefedettség, UX-illeszkedés, epic/story minőség, végső összegzés) 0 kritikus és 0 major hibát talált, viszont 2 apró, nem blokkoló hiányosságot igen: Story 1.2-ből hiányzik egy explicit AC a szerver-bootstrapra (Express/PORT), Story 1.1-ből a `budget`/`note` mezők átvitelére. Végeredmény: **READY**, FR-lefedettség 100%.

## bmad-sprint-planning — sprint-status.yaml generálása (2026-07-14)

Teljesen autonóm lefutás, egyetlen kérdés vagy megerősítés sem szükséges — nincs is menü ebben a skillben. Az `epics.md`-ből 1 epicet és 3 story-t olvasott ki, mindet `backlog` státusszal hozta létre (még egy story-fájl sem létezik az implementation-artifacts alatt), plusz egy `epic-1-retrospective: optional` bejegyzést. Nem volt korrekció, nem volt meglepetés — tiszta gépies leképezés.
