# HF2 Customer Distance REST Service

A small, offline REST service over Postgres: idempotent seed + geocoding, `GET /customers/count`, and `GET /customers/by-distance` (ordered by distance to Budapest).

## Prerequisites

- Node.js 24+
- Docker (for Postgres)

## 1. Start Postgres

```
docker compose up -d
```

This starts a `postgres:16-alpine` container named `hf2-postgres` on `localhost:5434`, with database/user/password all `hf2`. Wait for it to become healthy before continuing:

```
docker compose ps
# hf2-postgres should show "healthy" — if it still says "starting", wait a few seconds and re-check
```

Create a `.env` file in the project root (gitignored) with the connection string:

```
DATABASE_URL=postgres://hf2:hf2@localhost:5434/hf2
```

## 2. Install dependencies

```
npm install
```

## 3. Run the migration

```
npm run migrate
```

Creates the `customers` table (`id`, `name`, `telepules`, `lat`, `lon`, `budget`, `note`) with a `UNIQUE (name, telepules)` constraint.

## 4. Seed the data

```
npm run seed
```

Loads `seed-customers.json`, geocodes each customer's city against `reference/city-coordinates.json`, and inserts all rows. Safe to re-run — it never duplicates rows.

## 5. Start the server

```
npm start
```

Starts the API on `http://localhost:3000` (override with the `PORT` env var).

## 6. Run the tests

```
npm test
```

Runs the full automated test suite (`node --test`), including the 3 required haversine unit tests, against the same Postgres instance.

## Try it

```
curl http://localhost:3000/customers/count
# {"count":15}

curl http://localhost:3000/customers/by-distance
# [{"id":1,"name":"Anna Kovács","telepules":"Budapest","budget":850,"note":"...","distanceKm":0}, ...]
```
