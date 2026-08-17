const express = require('express');
const db = require('../db');
const { validate, schemas } = require('../middleware/validate');
const { computeQuote } = require('../utils/pricing');

const router = express.Router();

// GET /api/services
router.get('/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY name').all();
  res.json({ services });
});

// GET /api/extras
router.get('/extras', (req, res) => {
  const extras = db.prepare('SELECT * FROM extras WHERE active = 1 ORDER BY name').all();
  res.json({ extras });
});

// POST /api/pricing/quote
router.post('/pricing/quote', validate(schemas.quote), (req, res) => {
  const { service_id, rooms, extra_ids } = req.body;

  try {
    const quote = computeQuote(service_id, rooms, extra_ids || []);
    res.json({
      subtotal: quote.subtotal,
      discount: quote.discount,
      vat: quote.vat,
      total: quote.total,
      service: quote.service,
      extras: quote.extras,
      rooms: quote.roomCount,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// GET /api/cleaners/available
router.get('/cleaners/available', (req, res) => {
  const cleaners = db.prepare(`
    SELECT u.id, u.full_name, cp.city, cp.province, cp.bio, cp.rating, cp.rating_count, cp.jobs_completed
    FROM cleaner_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.status = 'approved'
    ORDER BY cp.rating DESC
  `).all();
  res.json({ cleaners });
});

module.exports = router;
