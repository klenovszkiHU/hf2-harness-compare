const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const pool = require('../src/db/pool');
const customerService = require('../src/services/customerService');

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

test('GET /customers/count returns 500 with {"error": "internal error"} when the service rejects (AC #5)', async () => {
  const server = app.listen(0);
  const originalCount = customerService.count;
  customerService.count = async () => {
    throw new Error('simulated DB failure');
  };
  try {
    const { port } = server.address();
    const response = await fetch(`http://localhost:${port}/customers/count`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: 'internal error' });
  } finally {
    customerService.count = originalCount;
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

test('resolvePort() honors process.env.PORT when set, coerced to a number', () => {
  const originalPort = process.env.PORT;
  process.env.PORT = '4321';
  try {
    const result = app.resolvePort();
    assert.equal(result, 4321);
    assert.equal(typeof result, 'number');
  } finally {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  }
});
