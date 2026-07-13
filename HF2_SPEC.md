# HF2 — Harness-összehasonlítás: REST szolgáltatás specifikáció

## Feladat

Építs egy kicsi, önálló REST szolgáltatást Postgres fölött. Offline kell futnia: nincs külső geokódoló API, nincs LLM-hívás futásidőben.

## Adat

A seed adat a repóban lévő `seed-customers.json` fájlban van (15 ügyfél: `name`, `budget`, `location.city`, `location.countryCode`, `note`). A `location.city` a település.

## Adatmodell (minimum)

`customers`: `id`, `name`, `telepules`, `lat` (nullable), `lon` (nullable). A `budget` és a `note` eltárolható, de nem kötelező.

## Betöltés (idempotens seed + geokódolás)

- Töltsd be a `seed-customers.json`-t. Kétszer lefuttatva ne duplázzon (idempotens legyen).
- Minden ügyfél településéhez rendelj lat/lon-t egy lokális, a repóba bundle-olt település → lat/lon referenciából. A referencia a `reference/city-coordinates.json` fájlban van, előre elkészítve a seedben előforduló városokra, ismert koordinátákkal. **Nincs külső hívás.**
- A település-egyeztetés robusztus: ékezet- és kis/nagybetű-független, trimmelt whitespace. A "Budapest" (és opcionálisan a kerületei) a fővárosra esik.
- Ha egy település nincs a referenciában: `lat/lon = null`. Ez nem hiba, ne crasheljen. Logold, és menj tovább.

## Végpontok

- `GET /customers/count` → `{ "count": <egész> }` (a tényleges sorszámmal egyezik).
- `GET /customers/by-distance` → ügyféllista **növekvő távolság szerint Budapesthez képest**. Minden elem tartalmazza a `distanceKm` mezőt (1 tizedesre kerekítve). Budapesti ügyfelek elöl (0 km). Ismeretlen koordinátájú ügyfelek a lista végén, `distanceKm: null`. Holtverseny esetén `name` szerint.

## Teszt

Unit teszt a távolságszámításra (haversine):
- egy ismert táv (pl. Budapest–Bécs kb. 214 km)
- a 0 km-es eset (Budapest)
- a null-koordináta kezelése

## Minőség

- Kis, fókuszált commitok, hogy a folyamat is látszódjon.
- README a futtatáshoz: Postgres indítás, migráció, seed, szerver, tesztek.
- (Opcionális, ha van rá eszköz) Postgres MCP bekötése, hogy fejlesztés közben látszódjon a séma és az adat.

## Nincs benne

Auth, write végpontok (a seeden túl), frontend, külső geokódoló API, LLM.
