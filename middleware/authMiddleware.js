const jwt = require('jsonwebtoken');
const apiRequest = require('../services/api');

const verifyToken = async (req, res, next) => {
  try {
    // First check session
    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }

    // If no session, check for tokens
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
      if (req.accepts('html')) return res.redirect('/?error=not_logged_in');
      return res.status(401).json({ error: 'Access Denied. No token provided.' });
    }

    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

    // Verify access token
    try {
      const verified = jwt.verify(accessToken, secret);
      req.user = verified;
      return next();
    } catch (accessTokenError) {
      if (accessTokenError.name === 'TokenExpiredError') {
        // Attempt to refresh using refresh token (no external endpoint, handle locally)
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Verify refresh token
        let refreshVerified;
        try {
          refreshVerified = jwt.verify(refreshToken, secret);
          if (refreshVerified.type !== 'refresh') {
            throw new Error('Invalid refresh token type');
          }
        } catch (refreshError) {
          throw refreshError; // Will be caught below
        }

        // Generate new access token (short-lived, e.g., 1 hour)
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          id: refreshVerified.id,
          email: refreshVerified.email,
          bank_id: refreshVerified.bank_id,
          roles: refreshVerified.roles,
          custom_roles: refreshVerified.custom_roles,
          msisdn: refreshVerified.msisdn,
          iat: now,
          exp: now + 3600 // 1 hour
        };
        const newAccessToken = jwt.sign(payload, secret);

        // Generate new refresh token (rotate it for security, long-lived, e.g., 7 days)
        const refreshPayload = {
          ...payload,
          type: 'refresh',
          exp: now + 7 * 24 * 3600 // 7 days
        };
        const newRefreshToken = jwt.sign(refreshPayload, secret);

        // Set new tokens in cookies
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600 * 1000 // 1 hour
        });
        
        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Update session if exists
        if (req.session.user) {
          req.session.user.accessToken = newAccessToken;
          req.session.user.refreshToken = newRefreshToken;
        }

        // Set req.user from new payload
        req.user = payload;
        return next();
      }
      
      // Other JWT errors (invalid token, etc)
      throw accessTokenError;
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Clear invalid tokens
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    if (req.accepts('html')) {
      return res.redirect('/?error=Please login');
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

const verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.session.user || req.user;

    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return res.status(403).send('Access denied. Roles missing.');
    }

    const hasAccess = user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasAccess) {
      if (req.accepts('html')) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Unauthorized access'));
      }
      return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
    }

    next();
  };
};


const requireAuth = async (req, res, next) => {
  if (!req.session.user) {
    // Nettoyer toutes les traces de session
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('connect.sid');

    return res.redirect('/?error=' + encodeURIComponent('Session expired'));
  }
  next();
};


const requireNoBankId = async (req, res, next) => {
  const user = req.session.user;
  if (user && user.bank_id) {
    return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied'));
  }
  next();
};


const noCache = async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

module.exports = {
  verifyToken,
  requireAuth,
  verifyRole,
  noCache,
  requireNoBankId,
};