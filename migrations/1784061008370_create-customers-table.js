/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('customers', {
    id: 'id',
    name: { type: 'text', notNull: true },
    telepules: { type: 'text', notNull: true },
    lat: { type: 'double precision', notNull: false },
    lon: { type: 'double precision', notNull: false },
    budget: { type: 'numeric(10,2)', notNull: false },
    note: { type: 'text', notNull: false },
  });

  pgm.addConstraint('customers', 'customers_name_telepules_key', {
    unique: ['name', 'telepules'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('customers');
};
