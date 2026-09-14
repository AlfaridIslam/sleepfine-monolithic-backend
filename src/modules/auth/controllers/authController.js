import authService from '../services/authService.js';
import config from '../../../config/index.js';
import logger from '../../../utils/logger.js';
import ApiResponse from '../../../utils/response.js';

/**
 * Secure single-collection direct O(1) login
 */
export const login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return ApiResponse.badRequest(res, 'Email, password, and userType are required');
    }

    const result = await authService.loginService({
      email,
      password,
      userType,
      ip: req.ip,
    });

    if (!result.success) {
      return ApiResponse.unauthorized(res, result.message || 'Invalid credentials');
    }

    // Set secure httpOnly cookie
    const isProduction = config.server.env === 'production';
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    return ApiResponse.success(res, 200, 'Login successful', {
      user: result.user,
      token: result.token,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    logger.error('Login error:', error);
    return ApiResponse.internalError(res, 'Internal server error during authentication');
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: config.server.env === 'production',
      sameSite: 'strict',
      path: '/',
    });

    logger.info('User logged out', {
      userId: req.user?.id,
      ip: req.ip,
    });

    return ApiResponse.success(res, 200, 'Logout successful');
  } catch (error) {
    logger.error('Logout error:', error);
    return ApiResponse.internalError(res, 'Internal server error during logout');
  }
};

/**
 * Check current user authentication status
 */
export const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authenticated');
    }

    return ApiResponse.success(res, 200, 'Authenticated', {
      user: req.user,
      authenticated: true,
    });
  } catch (error) {
    logger.error('Auth check error:', error);
    return ApiResponse.internalError(res, 'Internal server error');
  }
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (req, res) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const result = await authService.refreshTokenService(req.user);

    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: config.server.env === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return ApiResponse.success(res, 200, 'Token refreshed successfully', {
      token: result.token,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return ApiResponse.internalError(res, 'Internal server error');
  }
};

export default {
  login,
  logout,
  checkAuth,
  refreshToken,
};
