const fs = require('node:fs');
const path = require('node:path');
const normalizeCity = require('../lib/normalizeCity');

const SEED_CUSTOMERS_PATH = path.join(__dirname, '..', '..', 'seed-customers.json');
const CITY_REFERENCE_PATH = path.join(__dirname, '..', '..', 'reference', 'city-coordinates.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findCoordinates(referenceCities, city, countryCode) {
  const normalizedCity = normalizeCity(city);
  return referenceCities.find(
    (entry) => entry.normalizedCity === normalizedCity && entry.countryCode === countryCode
  );
}

function buildCustomerRow(customer, referenceCities) {
  const { name, budget, location, note } = customer;
  const { city, countryCode } = location;

  const match = findCoordinates(referenceCities, city, countryCode);

  if (!match) {
    console.warn(`No geocoding match for city "${city}" (${countryCode}) — customer "${name}" will have null lat/lon.`);
  }

  return {
    name,
    telepules: city,
    lat: match ? match.lat : null,
    lon: match ? match.lon : null,
    budget: budget ?? null,
    note: note ?? null,
  };
}

async function seed(pool) {
  const customers = loadJson(SEED_CUSTOMERS_PATH);
  const referenceCities = loadJson(CITY_REFERENCE_PATH);

  for (const customer of customers) {
    const row = buildCustomerRow(customer, referenceCities);

    await pool.query(
      `INSERT INTO customers (name, telepules, lat, lon, budget, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name, telepules) DO NOTHING`,
      [row.name, row.telepules, row.lat, row.lon, row.budget, row.note]
    );
  }
}

module.exports = { seed, findCoordinates, buildCustomerRow };
