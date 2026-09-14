import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from '../config/index.js';
import { hasPermission, canAccessRole } from '../constants/roles.js';
import logger from '../utils/logger.js';
import ApiResponse from '../utils/response.js';

// JWT Strategy with cookie support
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    ExtractJwt.fromUrlQueryParameter('token'),
    (req) => req.cookies?.authToken || req.cookies?.token
  ]),
  secretOrKey: config.jwt.secret,
  passReqToCallback: true,
}, async (req, payload, done) => {
  try {
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return done(null, false, { message: 'Token expired' });
    }

    req.user = {
      _id: payload.userId,
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
      permissions: payload.permissions || [],
    };

    return done(null, req.user);
  } catch (error) {
    logger.error('JWT Strategy Error:', error);
    return done(error, false);
  }
}));

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request
 */
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Authentication error:', err);
      return ApiResponse.unauthorized(res, 'Authentication failed');
    }

    if (!user) {
      logger.logSecurity('authentication_failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: info?.message || 'No user found',
      });
      return ApiResponse.unauthorized(res, info?.message || 'Authentication required');
    }

    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Role-based authorization middleware
 * @param {string|Array} roles - Required role(s)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const userRole = req.user.role?.toLowerCase();
    const requiredRoles = (Array.isArray(roles) ? roles : [roles]).map(r => r.toLowerCase());

    const isAuthorized = requiredRoles.includes(userRole) ||
      (userRole === 'accountant' && requiredRoles.includes('accounts')) ||
      (userRole === 'accounts' && requiredRoles.includes('accountant')) ||
      (userRole === 'super_admin' && requiredRoles.includes('admin'));

    if (!isAuthorized) {
      logger.logSecurity('authorization_failed', {
        userId: req.user.id,
        userRole,
        requiredRoles,
        ip: req.ip,
        url: req.url,
      });
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {string|Array} permissions - Required permission(s)
 */
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const userRole = req.user.role?.toLowerCase();
    const userPermissions = req.user.permissions || [];
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    const hasAllPermissions = requiredPermissions.every(permission => {
      if (userRole === 'admin' || userRole === 'super_admin') return true;
      if (userPermissions.includes('*') || userPermissions.includes(permission)) return true;
      return hasPermission(userRole, permission);
    });

    if (!hasAllPermissions) {
      logger.logSecurity('permission_denied', {
        userId: req.user.id,
        userRole,
        requiredPermissions,
        ip: req.ip,
        url: req.url,
      });
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Optional authentication middleware
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

export {
  authenticate,
  authorize,
  requirePermission,
  optionalAuth,
};
export default authenticate;
