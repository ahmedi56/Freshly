const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/cleaner/earnings
router.get('/earnings', requireAuth, requireRole('cleaner'), (req, res) => {
  const cleanerId = req.user.id;

  const totalRow = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total_earnings, COUNT(*) as completed_jobs
    FROM bookings WHERE cleaner_id = ? AND status = 'completed'
  `).get(cleanerId);

  const todayRow = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as today_earnings
    FROM bookings
    WHERE cleaner_id = ? AND status = 'completed' AND date(updated_at) = date('now')
  `).get(cleanerId);

  const profile = db.prepare('SELECT rating, rating_count, jobs_completed FROM cleaner_profiles WHERE user_id = ?').get(cleanerId);

  const recentCompleted = db.prepare(`
    SELECT b.id, b.total, b.updated_at, s.name as service_name, cu.full_name as customer_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users cu ON cu.id = b.customer_id
    WHERE b.cleaner_id = ? AND b.status = 'completed'
    ORDER BY b.updated_at DESC
    LIMIT 10
  `).all(cleanerId);

  res.json({
    today_earnings: todayRow.today_earnings,
    total_earnings: totalRow.total_earnings,
    completed_jobs: totalRow.completed_jobs,
    rating: profile ? profile.rating : 0,
    rating_count: profile ? profile.rating_count : 0,
    recent_completed: recentCompleted,
  });
});

module.exports = router;
