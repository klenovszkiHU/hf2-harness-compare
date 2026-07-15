const express = require('express');
const customersRouter = require('./routes/customers');

const app = express();

app.use('/customers', customersRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

function resolvePort() {
  return Number(process.env.PORT) || 3000;
}

if (require.main === module) {
  const port = resolvePort();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
module.exports.resolvePort = resolvePort;
