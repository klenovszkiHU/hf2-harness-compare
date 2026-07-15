const express = require('express');
const customerService = require('../services/customerService');

const router = express.Router();

router.get('/count', async (req, res, next) => {
  try {
    const count = await customerService.count();
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.get('/by-distance', async (req, res, next) => {
  try {
    const customers = await customerService.byDistance();
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
