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

## bmad-create-story — Story 1.1 kontextusfájl (2026-07-14)

Egyetlen kérdést tett fel előzetesen (szubágens-használat engedélyezése a teljes workflow-futásra), amit a felhasználó jóváhagyott. A friss kontextusú, szubágenssel futtatott minőségi review 2 kritikus hibát talált a megírt story-ban — ezek voltak az igazi korrekciós pontok: (1) a fájlútvonalak inkonzisztensek voltak (`lib/`/`services/` a `src/lib/`/`src/services/` helyett), (2) a `telepules` oszlop értéke nem volt egyértelműen az eredeti (nem normalizált) városnév, összekeverhető lett volna a lookuphoz használt normalizált kulccsal. Mindkettőt javította, plusz 3 kiegészítést épített be (automatizált node:test tesztek az idempotenciára/null-esetre, countryCode-eltérés kezelése, README-hézag jelzése az epic szintjén). A sprint-status.yaml frissült: epic-1 → in-progress, Story 1.1 → ready-for-dev.

## bmad-dev-story — Story 1.1 implementációja (2026-07-14)

1 kérdést tett fel: a `hf2-postgres` Docker-konténerben egy régi, Prisma-sémájú `customers` tábla maradványát találta (más/korábbi harness-próbálkozásból, a BMad-újraépítés előttről) — a felhasználó jóváhagyta a régi táblák törlését és ugyanaz a konténer újrahasználatát. Ezen kívül nem volt korrekció a felhasználó felől, de az implementáció közben egy technikai meglepetés jött elő: a `node-pg-migrate create` alapból ESM-szintaxisú migrációs fájlt generál, ami nem illik a projekt CommonJS-konvenciójához — ezt CJS-re írta át. Mind a 3 AC élesben, futó Postgres ellen lett ellenőrizve (nem csak elméletben): migráció, seed kétszeri futtatása (idempotencia igazolva, 15 sor mindkétszer), és a valós adatokban szereplő "Kraków" ékezet-normalizálási eset. 8/8 automatizált teszt zöld. A story állapota `review`-ra állt, epic-1 marad `in-progress`.

## bmad-code-review — Story 1.1 review (2026-07-14)

Nem tett fel kérdést a review-cél meghatározásakor (a felhasználó explicit megnevezte: "Story 1.1"), csak egy megerősítést kért a diff/spec-kontextus elfogadására, majd egyet a patch-tételek kezelésére (mindkettőre az ajánlott/"javítsd most" válasz érkezett). 3 párhuzamos adverzariális réteg (Blind Hunter, Edge Case Hunter, Acceptance Auditor) futott a `3eee25a..0c8dd36` diffen. A legfontosabb, valós találat: a Blind Hunter szerint a teszt-suite ténylegesen NEM futna le tiszta shellben, mert semmi nem tölti be a `.env`-et — ezt magam is reprodukáltam (`unset DATABASE_URL` után 1/8 teszt elbukott), vagyis a korábbi "8/8 zöld" állításom csak a saját shell-sessionöm örökölt env-változóján múlt. Ez volt az igazi meglepetés/korrekció ebben a lépésben. Javítottam Node beépített `--env-file-if-exists` flagjével (0 új függőség), plusz 3 kisebb hibát (kétértelmű log-üzenetek, hiányzó location-védelem, kommentezetlen regex) — mind a 4 patch-tétel javítva, 4 defer, 6 dismiss. A Blind Hunter szubágens emellett kiírta a `.env` tartalmát (triviális lokális dev jelszó) a saját válaszába — ezt jeleztem a felhasználónak biztonsági okból, bár alacsony kockázatú. Végeredmény: 10/10 teszt zöld tiszta shellben, story → `done`, epic-1 marad `in-progress` (Story 1.2/1.3 még hátra van).
