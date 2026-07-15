const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCustomerRow } = require('../src/services/seedService');

const referenceCities = [
  { city: 'Budapest', countryCode: 'HU', lat: 47.4979, lon: 19.0402, normalizedCity: 'budapest' },
  { city: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721, normalizedCity: 'vienna' },
];

test('buildCustomerRow sets lat/lon from a matching reference entry', () => {
  const customer = { name: 'Test Person', budget: 100, location: { city: 'Vienna', countryCode: 'AT' }, note: 'note' };
  const row = buildCustomerRow(customer, referenceCities);

  assert.equal(row.telepules, 'Vienna');
  assert.equal(row.lat, 48.2085);
  assert.equal(row.lon, 16.3721);
});

test('buildCustomerRow sets lat/lon to null and does not throw when no city matches', () => {
  const customer = { name: 'Test Person', budget: 100, location: { city: 'Nowhereville', countryCode: 'ZZ' }, note: null };

  assert.doesNotThrow(() => buildCustomerRow(customer, referenceCities));

  const row = buildCustomerRow(customer, referenceCities);
  assert.equal(row.lat, null);
  assert.equal(row.lon, null);
  assert.equal(row.telepules, 'Nowhereville');
});

test('buildCustomerRow treats a normalizedCity match with a different countryCode as no match', () => {
  const customer = { name: 'Test Person', budget: 100, location: { city: 'Vienna', countryCode: 'ZZ' }, note: null };
  const row = buildCustomerRow(customer, referenceCities);

  assert.equal(row.lat, null);
  assert.equal(row.lon, null);
});

test('buildCustomerRow stores the original, unnormalized city string in telepules', () => {
  const customer = { name: 'Test Person', budget: 100, location: { city: 'VIENNA  ', countryCode: 'AT' }, note: null };
  const row = buildCustomerRow(customer, referenceCities);

  assert.equal(row.telepules, 'VIENNA  ');
});

test('buildCustomerRow does not throw and returns null lat/lon when location is missing entirely', () => {
  const customer = { name: 'Test Person', budget: 100, note: null };

  assert.doesNotThrow(() => buildCustomerRow(customer, referenceCities));

  const row = buildCustomerRow(customer, referenceCities);
  assert.equal(row.lat, null);
  assert.equal(row.lon, null);
});

test('buildCustomerRow does not throw and returns null lat/lon when location.city is missing', () => {
  const customer = { name: 'Test Person', budget: 100, location: { countryCode: 'AT' }, note: null };

  assert.doesNotThrow(() => buildCustomerRow(customer, referenceCities));

  const row = buildCustomerRow(customer, referenceCities);
  assert.equal(row.lat, null);
  assert.equal(row.lon, null);
});
