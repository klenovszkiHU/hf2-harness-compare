const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/pool');
const { seed } = require('../src/services/seedService');

test('running the seed twice yields the same row count (AC #3)', async () => {
  await seed(pool);
  const first = await pool.query('SELECT count(*) FROM customers');
  const firstCount = Number(first.rows[0].count);

  await seed(pool);
  const second = await pool.query('SELECT count(*) FROM customers');
  const secondCount = Number(second.rows[0].count);

  assert.equal(secondCount, firstCount);

  await pool.end();
});
