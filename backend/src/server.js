require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const seed = require('./db/seed');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const bookingRoutes = require('./routes/bookings');
const cleanerRoutes = require('./routes/cleaner');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

// utils/auth.js throws synchronously if JWT_SECRET is missing/weak, so this
// require alone is enough to make an insecure boot fail fast.
require('./utils/auth');

// Ensure schema exists and seed demo data on first boot. seed() runs migrate()
// itself, so there is no need to call migrate() separately here.
seed();

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header) and any
      // explicitly configured origin. Everything else is rejected — no
      // wildcard, and credentials (cookies) are only ever sent to origins
      // we've named.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const err = new Error('Not allowed by CORS');
      err.status = 403;
      return callback(err);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Basic request log (no sensitive data - never logs password fields)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', catalogRoutes); // /api/services, /api/extras, /api/pricing/quote, /api/cleaners/available
app.use('/api/bookings', bookingRoutes);
app.use('/api/cleaner', cleanerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler - never leak raw error objects/stack to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Freshly API listening on port ${PORT}`);
});
