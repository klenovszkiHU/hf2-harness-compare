const pool = require('../db/pool');
const haversine = require('../lib/haversine');
const cityCoordinates = require('../../reference/city-coordinates.json');

const BUDAPEST = cityCoordinates.find((entry) => entry.normalizedCity === 'budapest');

if (!BUDAPEST) {
  throw new Error(
    'reference/city-coordinates.json has no "budapest" entry — cannot compute distanceKm'
  );
}

// Accepts an optional queryable (a pg.Pool or a checked-out pg.Client) so
// tests can run this inside an uncommitted transaction without touching
// the shared pool's connections.
async function count(queryable = pool) {
  const result = await queryable.query('SELECT COUNT(*) FROM customers');
  return Number(result.rows[0].count);
}

function compareByDistance(a, b) {
  if (a.distanceKm === null && b.distanceKm === null) {
    return a.name.localeCompare(b.name);
  }
  if (a.distanceKm === null) return 1;
  if (b.distanceKm === null) return -1;
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  return a.name.localeCompare(b.name);
}

async function byDistance(queryable = pool) {
  const result = await queryable.query(
    'SELECT id, name, telepules, lat, lon, budget, note FROM customers'
  );

  const customers = result.rows.map((row) => {
    const km = haversine(row.lat, row.lon, BUDAPEST.lat, BUDAPEST.lon);
    return {
      id: row.id,
      name: row.name,
      telepules: row.telepules,
      budget: row.budget === null ? null : Number(row.budget),
      note: row.note,
      distanceKm: km === null ? null : Math.round(km * 10) / 10,
    };
  });

  return customers.sort(compareByDistance);
}

module.exports = { count, byDistance };
