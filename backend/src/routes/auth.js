const express = require('express');
const db = require('../db');
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateCsrfToken,
  ACCESS_TOKEN_EXPIRES_MS,
  REFRESH_TOKEN_EXPIRES_MS,
} = require('../utils/auth');
const { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, baseCookieOpts } = require('../utils/cookies');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

function issueRefreshToken(userId) {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS).toISOString();
  db.prepare(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`).run(
    userId,
    tokenHash,
    expiresAt
  );
  return token;
}

function revokeRefreshTokenByHash(tokenHash) {
  db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL`).run(
    tokenHash
  );
}

// Native clients (Expo) have no cookie jar, so they signal `x-client: native`
// and receive the raw tokens in the response body to store in the OS
// keychain. Browser clients get httpOnly cookies and must NOT get the raw
// refresh token in the body — that would make it readable by any script
// (XSS), defeating the whole point of the httpOnly cookie.
function isNativeClient(req) {
  return req.headers['x-client'] === 'native';
}

// Issues a fresh access + refresh + CSRF token set for `user`, sets them as
// httpOnly cookies for the browser client, and also returns the raw tokens
// in the response body for native/mobile clients that store them in secure
// device storage instead of relying on cookies.
function issueSession(req, res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);
  const csrfToken = generateCsrfToken();

  res.cookie(ACCESS_COOKIE, accessToken, baseCookieOpts(ACCESS_TOKEN_EXPIRES_MS));
  res.cookie(REFRESH_COOKIE, refreshToken, baseCookieOpts(REFRESH_TOKEN_EXPIRES_MS, '/api/auth'));
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookieOpts(REFRESH_TOKEN_EXPIRES_MS), httpOnly: false });

  return { accessToken, refreshToken, csrfToken };
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

// POST /api/auth/register
router.post('/register', validate(schemas.register), (req, res) => {
  const { role, full_name, email, phone, password, city, province, bio } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const password_hash = hashPassword(password);

  const insertUser = db.prepare(`
    INSERT INTO users (role, full_name, email, phone, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const txn = db.transaction(() => {
    const userId = insertUser.run(role, full_name, email, phone || null, password_hash).lastInsertRowid;

    if (role === 'cleaner') {
      db.prepare(`
        INSERT INTO cleaner_profiles (user_id, status, city, province, bio)
        VALUES (?, 'pending', ?, ?, ?)
      `).run(userId, city || null, province || null, bio || null);
    }

    return userId;
  });

  const userId = txn();
  const user = db.prepare('SELECT id, role, full_name, email, phone, created_at FROM users WHERE id = ?').get(userId);
  const tokens = issueSession(req, res, user);

  const responsePayload = { user };
  if (isNativeClient(req)) {
    responsePayload.accessToken = tokens.accessToken;
    responsePayload.refreshToken = tokens.refreshToken;
  }
  if (role === 'cleaner') {
    responsePayload.message = 'Application submitted. Your account is pending admin approval.';
  }

  res.status(201).json(responsePayload);
});

// POST /api/auth/login
router.post('/login', validate(schemas.login), (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password_hash, ...safeUser } = user;
  const tokens = issueSession(req, res, safeUser);

  const payload = { user: safeUser };
  if (isNativeClient(req)) {
    payload.accessToken = tokens.accessToken;
    payload.refreshToken = tokens.refreshToken;
  }
  res.json(payload);
});

// POST /api/auth/refresh — rotates the refresh token: the old one is
// revoked immediately so it can never be replayed, and a new pair is issued.
router.post('/refresh', validate(schemas.refreshToken), (req, res) => {
  const token = (req.cookies && req.cookies[REFRESH_COOKIE]) || req.body.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const tokenHash = hashRefreshToken(token);
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash);

  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  revokeRefreshTokenByHash(tokenHash);

  const user = db.prepare('SELECT id, role, full_name, email, phone, created_at FROM users WHERE id = ?').get(row.user_id);
  if (!user) {
    clearSessionCookies(res);
    return res.status(401).json({ error: 'User not found' });
  }

  const tokens = issueSession(req, res, user);
  const payload = { user };
  if (isNativeClient(req)) {
    payload.accessToken = tokens.accessToken;
    payload.refreshToken = tokens.refreshToken;
  }
  res.json(payload);
});

// POST /api/auth/logout — accepts the refresh token via cookie (web) or
// request body (native clients, which have no cookie jar).
router.post('/logout', validate(schemas.refreshToken), (req, res) => {
  const token = (req.cookies && req.cookies[REFRESH_COOKIE]) || req.body.refreshToken;
  if (token) revokeRefreshTokenByHash(hashRefreshToken(token));
  clearSessionCookies(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, role, full_name, email, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'cleaner') {
    const profile = db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').get(user.id);
    user.cleaner_profile = profile;
  }

  res.json({ user });
});

module.exports = router;
