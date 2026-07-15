const test = require('node:test');
const assert = require('node:assert/strict');
const haversine = require('../src/lib/haversine');

// Budapest and Vienna reference coordinates, matching reference/city-coordinates.json.
const BUDAPEST = { lat: 47.4979, lon: 19.0402 };
const VIENNA = { lat: 48.2085, lon: 16.3721 };

test('haversine(Budapest, Vienna) is approximately 214 km', () => {
  const km = haversine(BUDAPEST.lat, BUDAPEST.lon, VIENNA.lat, VIENNA.lon);
  assert.ok(Math.abs(km - 214) < 1, `expected ~214 km, got ${km}`);
});

test('haversine(same point, same point) is 0 km', () => {
  const km = haversine(BUDAPEST.lat, BUDAPEST.lon, BUDAPEST.lat, BUDAPEST.lon);
  assert.equal(km, 0);
});

test('haversine returns null when any coordinate is null', () => {
  assert.equal(haversine(null, BUDAPEST.lon, VIENNA.lat, VIENNA.lon), null);
  assert.equal(haversine(BUDAPEST.lat, null, VIENNA.lat, VIENNA.lon), null);
  assert.equal(haversine(BUDAPEST.lat, BUDAPEST.lon, null, VIENNA.lon), null);
  assert.equal(haversine(BUDAPEST.lat, BUDAPEST.lon, VIENNA.lat, null), null);
});
