const pool = require('../src/db/pool');
const { seed } = require('../src/services/seedService');

async function main() {
  try {
    await seed(pool);
    console.log('Seed complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
