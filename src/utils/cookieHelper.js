// backend/src/utils/cookieHelper.js

/**
 * 🍪 COOKIE CONFIGURATION HELPER
 * Centralized cookie settings for JWT tokens
 */

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,        // Cannot be accessed by JavaScript
    secure: isProduction,  // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // CSRF protection
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    // domain: process.env.COOKIE_DOMAIN || undefined // Uncomment if using subdomain
  };
};

const getRefreshTokenCookieOptions = () => {
  const baseOptions = getCookieOptions();
  return {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh token
  };
};

const clearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // domain: process.env.COOKIE_DOMAIN || undefined
  };
};

module.exports = {
  getCookieOptions,
  getRefreshTokenCookieOptions,
  clearCookieOptions
};