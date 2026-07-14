const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const pool = require('../src/db/pool');

test('GET /customers/count returns the live row count over HTTP', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://localhost:${port}/customers/count`);
    const body = await response.json();

    const direct = await pool.query('SELECT COUNT(*) FROM customers');
    const expected = Number(direct.rows[0].count);

    assert.equal(response.status, 200);
    assert.deepEqual(body, { count: expected });
  } finally {
    server.close();
  }
});

test('GET /nonexistent falls through to Express default 404', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://localhost:${port}/nonexistent`);
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});

test('resolvePort() defaults to 3000 when PORT is unset', () => {
  const originalPort = process.env.PORT;
  delete process.env.PORT;
  try {
    assert.equal(app.resolvePort(), 3000);
  } finally {
    if (originalPort !== undefined) process.env.PORT = originalPort;
  }
});

test('resolvePort() honors process.env.PORT when set', () => {
  const originalPort = process.env.PORT;
  process.env.PORT = '4321';
  try {
    assert.equal(app.resolvePort(), '4321');
  } finally {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  }
});
