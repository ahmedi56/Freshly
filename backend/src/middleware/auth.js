const { verifyAccessToken } = require('../utils/auth');
const { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER } = require('../utils/cookies');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Requires a valid access token. Accepts either an `Authorization: Bearer`
 * header (native/mobile clients, which can't rely on browser cookies) or the
 * httpOnly access-token cookie (web). Attaches req.user = { id, role, email,
 * full_name }.
 *
 * When the token came from the cookie, this is a browser session — so any
 * mutating request must also carry a matching CSRF header (double-submit
 * cookie pattern). SameSite=Lax already blocks most cross-site cookie use,
 * this is defense in depth. Bearer-token requests skip the CSRF check: a
 * cross-site page cannot read another origin's Authorization header, so
 * there is no ambient credential for it to ride on.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies ? req.cookies[ACCESS_COOKIE] : null;

  const token = bearerToken || cookieToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const usedCookie = !bearerToken && !!cookieToken;
  if (usedCookie && MUTATING_METHODS.has(req.method)) {
    const csrfHeader = req.headers[CSRF_HEADER];
    const csrfCookie = req.cookies ? req.cookies[CSRF_COOKIE] : null;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Requires req.user.role to be one of the allowed roles. Must run after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
