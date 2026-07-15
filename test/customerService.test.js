const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/pool');
const { count, byDistance } = require('../src/services/customerService');

test('count() returns a JS number, not a string', async () => {
  const result = await count();
  assert.equal(typeof result, 'number');
});

test('count() returns the current row count on two consecutive calls', async () => {
  const first = await count();
  const second = await count();
  assert.equal(first, second);
});

test('count() returns 0 for an empty table (uncommitted, never affects other tests)', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM customers');
    const result = await count(client);
    assert.equal(result, 0);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('byDistance() puts the Budapest customer first with distanceKm 0, sorted ascending, shape has exactly 6 keys', async () => {
  const rows = await byDistance();

  assert.equal(rows[0].name, 'Anna Kovács');
  assert.equal(rows[0].distanceKm, 0);

  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1].distanceKm;
    const curr = rows[i].distanceKm;
    if (prev !== null && curr !== null) {
      assert.ok(curr >= prev, `row ${i} (${curr}km) is out of order after ${prev}km`);
    }
  }

  for (const row of rows) {
    assert.deepEqual(Object.keys(row), ['id', 'name', 'telepules', 'budget', 'note', 'distanceKm']);
  }
});

test('byDistance() returns budget as a JS number, not a string', async () => {
  const rows = await byDistance();
  for (const row of rows) {
    if (row.budget !== null) {
      assert.equal(typeof row.budget, 'number');
    }
  }
});

test('byDistance() returns [] for an empty table (uncommitted, never affects other tests)', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM customers');
    const rows = await byDistance(client);
    assert.deepEqual(rows, []);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('byDistance() breaks ties by name ascending, for two customers at the same rounded distance (uncommitted)', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM customers');
    // Both at Budapest's exact coordinates -> both distanceKm: 0, a tie.
    await client.query(
      `INSERT INTO customers (name, telepules, lat, lon, budget, note) VALUES
       ('Zsolt Tie', 'Budapest', 47.4979, 19.0402, NULL, NULL),
       ('Adam Tie', 'Budapest', 47.4979, 19.0402, NULL, NULL)`
    );
    const rows = await byDistance(client);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, 'Adam Tie');
    assert.equal(rows[1].name, 'Zsolt Tie');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('byDistance() sorts null-coordinate customers after every known-distance customer (uncommitted)', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO customers (name, telepules, lat, lon, budget, note) VALUES
       ('Unknown City Customer', 'Nowhereville', NULL, NULL, NULL, NULL)`
    );
    const rows = await byDistance(client);
    const last = rows[rows.length - 1];
    assert.equal(last.name, 'Unknown City Customer');
    assert.equal(last.distanceKm, null);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('byDistance() breaks ties by name when two DIFFERENT raw distances round to the same 1-decimal value (uncommitted)', async () => {
  // 49.3979 and 49.3981 are ~211.270km and ~211.293km from Budapest respectively
  // (different raw haversine output) but both round to 211.3 — the exact
  // rounding-collision scenario AC #4 names explicitly (e.g. 213.96/214.04 -> 214.0).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM customers');
    await client.query(
      `INSERT INTO customers (name, telepules, lat, lon, budget, note) VALUES
       ('Zsolt Round', 'Testville', 49.3979, 19.0402, NULL, NULL),
       ('Adam Round', 'Testville', 49.3981, 19.0402, NULL, NULL)`
    );
    const rows = await byDistance(client);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].distanceKm, 211.3);
    assert.equal(rows[1].distanceKm, 211.3);
    assert.equal(rows[0].name, 'Adam Round');
    assert.equal(rows[1].name, 'Zsolt Round');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('byDistance() breaks ties by name when two customers both have null distanceKm (uncommitted)', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM customers');
    await client.query(
      `INSERT INTO customers (name, telepules, lat, lon, budget, note) VALUES
       ('Zsolt Null', 'Nowhereville', NULL, NULL, NULL, NULL),
       ('Adam Null', 'Nowhereville', NULL, NULL, NULL, NULL)`
    );
    const rows = await byDistance(client);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].distanceKm, null);
    assert.equal(rows[1].distanceKm, null);
    assert.equal(rows[0].name, 'Adam Null');
    assert.equal(rows[1].name, 'Zsolt Null');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
