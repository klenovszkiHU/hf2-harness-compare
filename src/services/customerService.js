const pool = require('../db/pool');

// Accepts an optional queryable (a pg.Pool or a checked-out pg.Client) so
// tests can run this inside an uncommitted transaction without touching
// the shared pool's connections.
async function count(queryable = pool) {
  const result = await queryable.query('SELECT COUNT(*) FROM customers');
  return Number(result.rows[0].count);
}

module.exports = { count };
