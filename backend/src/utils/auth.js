const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET environment variable must be set to a random string of at least 32 characters. ' +
      'Refusing to start with a missing or weak secret. Generate one with: ' +
      "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
}

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const ACCESS_TOKEN_EXPIRES_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_COST);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, full_name: user.full_name, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

// Refresh tokens are opaque random strings, never JWTs — they are looked up
// by hash in the DB so they can be individually revoked/rotated. Only the
// hash is ever stored; the raw value only ever lives in the cookie/response.
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateCsrfToken,
  ACCESS_TOKEN_EXPIRES_MS,
  REFRESH_TOKEN_EXPIRES_MS,
};
