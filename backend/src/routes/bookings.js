const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { computeQuote } = require('../utils/pricing');
const { isValidCleanerTransition } = require('../utils/bookingStatus');

const router = express.Router();

function logEvent(bookingId, status, note, actorUserId) {
  db.prepare(`
    INSERT INTO booking_events (booking_id, status, note, actor_user_id)
    VALUES (?, ?, ?, ?)
  `).run(bookingId, status, note || null, actorUserId || null);
}

function notify(userId, message) {
  if (!userId) return;
  db.prepare(`INSERT INTO notifications (user_id, message) VALUES (?, ?)`).run(userId, message);
}

function pickBestAvailableCleaner() {
  return db.prepare(`
    SELECT u.id, cp.rating
    FROM cleaner_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.status = 'approved'
    ORDER BY cp.rating DESC, cp.jobs_completed DESC
    LIMIT 1
  `).get();
}

// POST /api/bookings - create a new booking
router.post('/', requireAuth, requireRole('customer'), validate(schemas.createBooking), (req, res) => {
  const {
    service_id, rooms, extra_ids, booking_date, time_slot,
    address, access_instructions, property_type, cleaner_id, auto_assign,
  } = req.body;

  let quote;
  try {
    quote = computeQuote(service_id, rooms, extra_ids || []);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  let assignedCleanerId = null;
  let initialStatus = 'pending';

  if (cleaner_id) {
    const cleaner = db.prepare(`
      SELECT u.id FROM cleaner_profiles cp JOIN users u ON u.id = cp.user_id
      WHERE u.id = ? AND cp.status = 'approved'
    `).get(cleaner_id);
    if (!cleaner) {
      return res.status(400).json({ error: 'Selected cleaner is not available' });
    }
    assignedCleanerId = cleaner.id;
    initialStatus = 'assigned';
  } else if (auto_assign) {
    const best = pickBestAvailableCleaner();
    if (best) {
      assignedCleanerId = best.id;
      initialStatus = 'assigned';
    }
  }

  const insert = db.prepare(`
    INSERT INTO bookings (
      customer_id, cleaner_id, service_id, property_type, rooms, extras_json,
      booking_date, time_slot, address, access_instructions,
      subtotal, discount, vat, total, status, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
  `);

  const result = insert.run(
    req.user.id,
    assignedCleanerId,
    service_id,
    property_type || null,
    quote.roomCount,
    JSON.stringify(extra_ids || []),
    booking_date,
    time_slot,
    address,
    access_instructions || null,
    quote.subtotal,
    quote.discount,
    quote.vat,
    quote.total,
    initialStatus
  );

  const bookingId = result.lastInsertRowid;
  logEvent(bookingId, 'pending', 'Booking created', req.user.id);
  if (initialStatus === 'assigned') {
    logEvent(bookingId, 'assigned', 'Cleaner assigned', req.user.id);
    notify(assignedCleanerId, `New job assigned: ${quote.service.name} on ${booking_date}`);
  }
  notify(req.user.id, `Your booking for ${quote.service.name} has been created.`);

  const booking = getFullBooking(bookingId);
  res.status(201).json({ booking });
});

function getFullBooking(id) {
  const booking = db.prepare(`
    SELECT b.*, s.name as service_name, s.icon as service_icon,
           cu.full_name as customer_name, cu.phone as customer_phone,
           cl.full_name as cleaner_name, cl.phone as cleaner_phone
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users cu ON cu.id = b.customer_id
    LEFT JOIN users cl ON cl.id = b.cleaner_id
    WHERE b.id = ?
  `).get(id);

  if (!booking) return null;

  const extraIds = JSON.parse(booking.extras_json || '[]');
  let extras = [];
  if (extraIds.length > 0) {
    const placeholders = extraIds.map(() => '?').join(',');
    extras = db.prepare(`SELECT * FROM extras WHERE id IN (${placeholders})`).all(...extraIds);
  }
  booking.extras = extras;

  booking.events = db.prepare(`
    SELECT * FROM booking_events WHERE booking_id = ? ORDER BY created_at ASC, id ASC
  `).all(id);

  return booking;
}

// GET /api/bookings/mine - role-aware
router.get('/mine', requireAuth, (req, res) => {
  let bookings;
  if (req.user.role === 'customer') {
    bookings = db.prepare(`
      SELECT b.*, s.name as service_name, s.icon as service_icon, cl.full_name as cleaner_name
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cl ON cl.id = b.cleaner_id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
  } else if (req.user.role === 'cleaner') {
    bookings = db.prepare(`
      SELECT b.*, s.name as service_name, s.icon as service_icon, cu.full_name as customer_name, cu.phone as customer_phone
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_id
      WHERE b.cleaner_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
  } else {
    return res.status(403).json({ error: 'Admins should use /api/admin/bookings' });
  }

  bookings.forEach((b) => { b.extras_ids = JSON.parse(b.extras_json || '[]'); });
  res.json({ bookings });
});

// GET /api/bookings/:id
router.get('/:id', requireAuth, (req, res) => {
  const booking = getFullBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isOwnerCustomer = req.user.role === 'customer' && booking.customer_id === req.user.id;
  const isOwnerCleaner = req.user.role === 'cleaner' && booking.cleaner_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwnerCustomer && !isOwnerCleaner && !isAdmin) {
    return res.status(403).json({ error: 'You do not have access to this booking' });
  }

  res.json({ booking });
});

// PATCH /api/bookings/:id/status - cleaner only, own bookings, validated transitions
router.patch('/:id/status', requireAuth, requireRole('cleaner'), validate(schemas.bookingStatus), (req, res) => {
  const { status: newStatus } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.cleaner_id !== req.user.id) {
    return res.status(403).json({ error: 'This booking is not assigned to you' });
  }
  if (!isValidCleanerTransition(booking.status, newStatus)) {
    return res.status(400).json({
      error: `Cannot transition from '${booking.status}' to '${newStatus}'`,
    });
  }

  db.prepare(`UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, booking.id);
  logEvent(booking.id, newStatus, 'Status updated by cleaner', req.user.id);

  if (newStatus === 'completed') {
    db.prepare(`
      UPDATE cleaner_profiles SET jobs_completed = jobs_completed + 1 WHERE user_id = ?
    `).run(req.user.id);
  }

  notify(booking.customer_id, `Your cleaning job is now: ${newStatus.replace(/_/g, ' ')}`);

  res.json({ booking: getFullBooking(booking.id) });
});

// POST /api/bookings/:id/decline - cleaner only, returns booking to pending
router.post('/:id/decline', requireAuth, requireRole('cleaner'), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.cleaner_id !== req.user.id) {
    return res.status(403).json({ error: 'This booking is not assigned to you' });
  }
  if (!['assigned', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot decline a booking with status '${booking.status}'` });
  }

  db.prepare(`
    UPDATE bookings SET cleaner_id = NULL, status = 'pending', updated_at = datetime('now') WHERE id = ?
  `).run(booking.id);
  logEvent(booking.id, 'pending', 'Declined by cleaner, returned to pending', req.user.id);
  notify(booking.customer_id, `Your assigned cleaner had to decline. We're finding you a new one.`);

  res.json({ booking: getFullBooking(booking.id) });
});

// POST /api/bookings/:id/rate - customer only, completed bookings only
router.post('/:id/rate', requireAuth, requireRole('customer'), validate(schemas.rateBooking), (req, res) => {
  const { rating, review } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'This is not your booking' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Only completed bookings can be rated' });
  }
  if (booking.rating) {
    return res.status(400).json({ error: 'This booking has already been rated' });
  }

  db.prepare(`UPDATE bookings SET rating = ?, review = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(rating, review || null, booking.id);

  if (booking.cleaner_id) {
    const profile = db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').get(booking.cleaner_id);
    if (profile) {
      const newCount = profile.rating_count + 1;
      const newAvg = ((profile.rating * profile.rating_count) + rating) / newCount;
      db.prepare(`UPDATE cleaner_profiles SET rating = ?, rating_count = ? WHERE user_id = ?`)
        .run(Math.round(newAvg * 100) / 100, newCount, booking.cleaner_id);
    }
    notify(booking.cleaner_id, `You received a new ${rating}-star rating!`);
  }

  res.json({ booking: getFullBooking(booking.id) });
});

module.exports = router;
