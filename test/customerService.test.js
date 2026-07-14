const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/pool');
const { count } = require('../src/services/customerService');

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
