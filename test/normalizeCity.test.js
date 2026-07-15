const test = require('node:test');
const assert = require('node:assert/strict');
const normalizeCity = require('../src/lib/normalizeCity');

test('normalizeCity strips diacritics and lowercases', () => {
  assert.equal(normalizeCity('Kraków'), 'krakow');
});

test('normalizeCity trims whitespace and lowercases', () => {
  assert.equal(normalizeCity('  Vienna  '), 'vienna');
});

test('normalizeCity resolves Budapest districts to "budapest"', () => {
  assert.equal(normalizeCity('Budapest XIII. kerület'), 'budapest');
});
