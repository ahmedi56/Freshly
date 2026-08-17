const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { isCancellable } = require('../utils/bookingStatus');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

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

// GET /api/admin/overview - real KPIs
router.get('/overview', (req, res) => {
  const todayRevenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue
    FROM bookings
    WHERE payment_status = 'paid' AND date(updated_at) = date('now')
  `).get().revenue;

  const totalBookings = db.prepare(`SELECT COUNT(*) as c FROM bookings`).get().c;

  const activeCleaners = db.prepare(`
    SELECT COUNT(*) as c FROM cleaner_profiles WHERE status = 'approved'
  `).get().c;

  const pendingApplications = db.prepare(`
    SELECT COUNT(*) as c FROM cleaner_profiles WHERE status = 'pending'
  `).get().c;

  const bookingsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM bookings GROUP BY status
  `).all();

  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue FROM bookings WHERE payment_status = 'paid'
  `).get().revenue;

  res.json({
    today_revenue: todayRevenue,
    total_revenue: totalRevenue,
    total_bookings: totalBookings,
    active_cleaners: activeCleaners,
    pending_applications: pendingApplications,
    bookings_by_status: bookingsByStatus,
  });
});

// GET /api/admin/bookings
router.get('/bookings', (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, s.name as service_name, cu.full_name as customer_name, cl.full_name as cleaner_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users cu ON cu.id = b.customer_id
    LEFT JOIN users cl ON cl.id = b.cleaner_id
    ORDER BY b.created_at DESC
  `).all();
  res.json({ bookings });
});

// PATCH /api/admin/bookings/:id/assign
router.patch('/bookings/:id/assign', validate(schemas.adminAssign), (req, res) => {
  const { cleaner_id } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const cleaner = db.prepare(`
    SELECT u.id FROM cleaner_profiles cp JOIN users u ON u.id = cp.user_id
    WHERE u.id = ? AND cp.status = 'approved'
  `).get(cleaner_id);
  if (!cleaner) return res.status(400).json({ error: 'Cleaner is not approved/available' });

  if (!['pending', 'confirmed', 'assigned'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot assign a cleaner to a booking in status '${booking.status}'` });
  }

  db.prepare(`
    UPDATE bookings SET cleaner_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?
  `).run(cleaner_id, booking.id);
  logEvent(booking.id, 'assigned', 'Assigned by admin', req.user.id);
  notify(cleaner_id, `New job assigned by admin for ${booking.booking_date}`);
  notify(booking.customer_id, `A cleaner has been assigned to your booking.`);

  const updated = db.prepare(`
    SELECT b.*, s.name as service_name, cu.full_name as customer_name, cl.full_name as cleaner_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users cu ON cu.id = b.customer_id
    LEFT JOIN users cl ON cl.id = b.cleaner_id
    WHERE b.id = ?
  `).get(booking.id);
  res.json({ booking: updated });
});

// PATCH /api/admin/bookings/:id/cancel
router.patch('/bookings/:id/cancel', validate(schemas.adminCancel), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!isCancellable(booking.status)) {
    return res.status(400).json({ error: `Cannot cancel a booking in status '${booking.status}'` });
  }

  db.prepare(`UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(booking.id);
  logEvent(booking.id, 'cancelled', req.body.reason || 'Cancelled by admin', req.user.id);
  notify(booking.customer_id, 'Your booking has been cancelled by our team.');
  if (booking.cleaner_id) notify(booking.cleaner_id, 'A job assigned to you has been cancelled.');

  res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) });
});

// GET /api/admin/cleaners
router.get('/cleaners', (req, res) => {
  const cleaners = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
           cp.status, cp.city, cp.province, cp.bio, cp.rating, cp.rating_count, cp.jobs_completed, cp.applied_at
    FROM cleaner_profiles cp
    JOIN users u ON u.id = cp.user_id
    ORDER BY
      CASE cp.status WHEN 'pending' THEN 0 ELSE 1 END,
      cp.applied_at DESC
  `).all();
  res.json({ cleaners });
});

// PATCH /api/admin/cleaners/:id/status
router.patch('/cleaners/:id/status', validate(schemas.adminCleanerStatus), (req, res) => {
  const { status } = req.body;

  const profile = db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Cleaner not found' });

  db.prepare('UPDATE cleaner_profiles SET status = ? WHERE user_id = ?').run(status, req.params.id);
  notify(req.params.id, `Your cleaner application status is now: ${status}`);

  const updated = db.prepare(`
    SELECT u.id, u.full_name, u.email, cp.status FROM cleaner_profiles cp
    JOIN users u ON u.id = cp.user_id WHERE u.id = ?
  `).get(req.params.id);
  res.json({ cleaner: updated });
});

// GET /api/admin/customers - with real booking count and lifetime value
router.get('/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
           COUNT(b.id) as booking_count,
           COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total ELSE 0 END), 0) as lifetime_value
    FROM users u
    LEFT JOIN bookings b ON b.customer_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY lifetime_value DESC
  `).all();
  res.json({ customers });
});

// GET /api/admin/services
router.get('/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY name').all();
  res.json({ services });
});

// POST /api/admin/services
router.post('/services', validate(schemas.adminServiceCreate), (req, res) => {
  const { name, category, base_price, icon } = req.body;
  const result = db.prepare(`
    INSERT INTO services (name, category, base_price, icon, active) VALUES (?, ?, ?, ?, 1)
  `).run(name, category || null, base_price, icon || null);
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ service });
});

// PATCH /api/admin/services/:id
router.patch('/services/:id', validate(schemas.adminServiceUpdate), (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const { name, category, base_price, icon, active } = req.body;
  db.prepare(`
    UPDATE services SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      base_price = COALESCE(?, base_price),
      icon = COALESCE(?, icon),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    name ?? null,
    category === undefined ? null : category,
    base_price ?? null,
    icon === undefined ? null : icon,
    active === undefined ? null : active,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  res.json({ service: updated });
});

module.exports = router;
