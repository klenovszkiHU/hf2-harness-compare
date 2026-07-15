# HF2 – Harness-összehasonlítás: Superpowers vs. BMAD-METHOD

## Setup és tanulási görbe

A Superpowers gyakorlatilag azonnal használható volt, mert a plugin már korábban, user-scope-ban telepítve volt – nem igényelt projektszintű setupot. A BMAD-METHOD ezzel szemben egy több lépéses, interaktív telepítőn keresztül áll be: modulválasztás, AI IDE integráció, projektnév és output-mappa megadása. Ez egyszeri, de érdemi többletidő volt az induláshoz képest – cserébe a telepítő maga is jelezte előre, milyen munkamódra kell számítani (négyfázisú, dokumentum-vezérelt pipeline), ami segített a további lépések megtervezésében.

## Tervezési fázis

A Superpowers egy előzetes, task-bontott tervet készített (`docs/superpowers/plans/...`), amit ténylegesen követett is – ezt a terv tartalma (előre rögzített interfész-szerződések a task-ok között) igazolta, nem csak az állítása. Ugyanakkor a tervdokumentum commitolása csak a legvégén történt meg, ami a git historyból nézve utólagosnak tűnhet, ha valaki csak a commit-időbélyegeket nézi.

A BMAD ezzel szemben egy explicit, egymásra épülő dokumentumláncot épített fel: Spec → Architektúra (4 párhuzamos review-körrel: spec-egyeztetés, rubrika, verzióellenőrzés, adversarial divergence-check) → Epics/Stories → Readiness check → Sprint Planning. Minden fázis saját, azonnali commitot kapott – a git history itt önmagában bizonyítja a tervezés-előbb, kódolás-utóbb sorrendet. A BMAD spec-fázisa emellett egy valódi ellentmondást is feltárt az eredeti HF2_SPEC.md-ben (a minimum adatmodell nem tartalmazta a `name` mezőt, pedig a rendezési logika arra épül), amit dokumentált feltételezésként oldott fel, nem csendben javított.

## Steering

A Superpowers a tervezéstől a kész, tesztelt, review-n átment kódig egy menetben ment végig – emberi jóváhagyási pont gyakorlatilag csak a legvégén volt (a branch sorsáról). A BMAD strukturálisan kikényszerítette a megállási pontokat: minden fázis (spec, architektúra, epics, readiness, sprint, majd storyk) külön lépés volt, emberi jóváhagyással a folytatás előtt. A BMAD emellett kérdésekkel (coaching mód) vont be a technológiai döntésekbe, ahol a Superpowers ezeket önállóan hozta meg.

## Kód minősége

Mindkét harness review-ciklusa talált és javított valódi, nem triviális hibát:

- Superpowers: elfelejtett seed-fájl commit, illetve egy flaky tesztet okozó, megosztott adatbázison versengő tesztfájl.
- BMAD: a Story 1.1 code review-ja reprodukálta, hogy a "8/8 teszt zöld" állítás hamis volt – a `.env` fájl sosem töltődött be automatikusan, a korábbi zöld eredmény csak egy véletlenül élő shell-környezeti változónak köszönhető. Tiszta shellben 1/8 teszt elbukott volna.

A BMAD-nél emellett megfigyelhető volt tanulás-átvitel story-k között: a Story 1.1 review-jánál felmerült teszt-izolációs kockázatot a Story 1.2 és 1.3 implementációja már kérés nélkül, magától kezelte.

## Kontroll

A Superpowers minimális emberi kontrollpontot igényelt munka közben, de éppen ezért nagyobb volt a kockázata annak, hogy egy hamis "kész" állapot észrevétlen marad. A BMAD több, kisebb lépésre bontotta a folyamatot, és minden lépésnél lehetőség (illetve szükség) volt emberi jóváhagyásra – ez lassabb, de nyomon követhetőbb munkamenetet adott.

## Időráfordítás (becslés)

Pontos mérést nem végeztem, de a munkamenet alapján a Superpowers-ág kb. 3-4 óra alatt készült el (telepítéstől a mergelt PR-ig), a BMAD-ág ehhez képest nagyjából 1,5-szer annyi időt vett igénybe. Ez összhangban van a fázisok számával: a BMAD hét különálló, saját dokumentumot és jóváhagyást igénylő lépésen ment végig (spec, architektúra, epics, readiness, sprint planning, 3× story-ciklus, retrospektíva), szemben a Superpowers egyetlen tervezés+implementáció+review menetével.

## Összegzés

Kisebb, jól körülhatárolt feladatoknál a Superpowers számomra meggyőzően működött: kevés volt a visszakérdezés, gyorsan haladt, és a végeredmény minősége nem maradt el a BMAD-tól. Nagyobb, összetettebb, több lépcsős projekteknél viszont a BMAD ad nagyobb biztonságot arra, hogy a végeredmény valóban működőképes lesz – a kikényszerített jóváhagyási pontok és az egymásra épülő dokumentumok miatt kevésbé valószínű, hogy egy hibás feltevés észrevétlen marad a folyamat közepén. Hosszú távra ezért a projekt méretétől tenném függővé a választást: kisebb feladatokhoz a Superpowers, nagyobb, csapatban futó fejlesztéshez a BMAD lenne az elsődleges választásom.
