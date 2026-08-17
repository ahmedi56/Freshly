const ACCESS_COOKIE = 'freshly_access';
const REFRESH_COOKIE = 'freshly_refresh';
const CSRF_COOKIE = 'freshly_csrf';
const CSRF_HEADER = 'x-csrf-token';

const isProd = process.env.NODE_ENV === 'production';

function baseCookieOpts(maxAgeMs, path = '/') {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path,
    maxAge: maxAgeMs,
  };
}

module.exports = { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, CSRF_HEADER, baseCookieOpts, isProd };
