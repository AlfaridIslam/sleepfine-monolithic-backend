import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../../config/index.js';
import logger from '../../../utils/logger.js';

// Cross-module service-to-service communication
import adminService from '../../admin/services/adminService.js';
import salesService from '../../sales/services/salesService.js';
import accountsService from '../../accounts/services/accountsService.js';
import logisticsService from '../../logistics/services/logisticsService.js';

class AuthService {
  // Service lookup dispatch map for O(1) user retrieval
  userLookups = {
    admin: (email) => adminService.findAdminByEmailForAuth(email),
    salesman: (email) => salesService.findSalesmanByEmailForAuth(email),
    accountant: (email) => accountsService.findAccountantByEmailForAuth(email),
    logistics: (email) => logisticsService.findLogisticsByEmailForAuth(email),
    driver: (email) => logisticsService.findDriverByEmailForAuth(email),
  };

  /**
   * Secure authentication service with O(1) domain service lookup
   */
  loginService = async ({ email, password, userType, ip }) => {
    const normalizedUserType = String(userType).toLowerCase().trim();
    const lookupFn = this.userLookups[normalizedUserType];

    if (!lookupFn) {
      logger.warn('Login attempt with unsupported userType', { email, userType: normalizedUserType, ip });
      return { success: false, message: 'Invalid credentials' };
    }

    const cleanEmail = email.toLowerCase().trim();

    // Query collection via domain service
    const user = await lookupFn(cleanEmail);

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email: cleanEmail, userType: normalizedUserType, ip });
      return { success: false, message: 'Invalid credentials' };
    }

    // Check account status
    if (user.isActive === false || (user.status !== undefined && user.status !== 'active')) {
      logger.warn('Login attempt with inactive account', { email: cleanEmail, userType: normalizedUserType, ip });
      return { success: false, message: 'Invalid credentials' };
    }

    if (user.isLocked) {
      logger.warn('Login attempt with locked account', { email: cleanEmail, userType: normalizedUserType, ip });
      return { success: false, message: 'Invalid credentials' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      if (typeof user.incLoginAttempts === 'function') {
        await user.incLoginAttempts();
      }
      logger.warn('Failed login attempt (invalid password)', { email: cleanEmail, userType: normalizedUserType, ip });
      return { success: false, message: 'Invalid credentials' };
    }

    // Reset login attempts
    if (user.loginAttempts > 0 && typeof user.resetLoginAttempts === 'function') {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIp = ip;
    await user.save();

    // Generate JWT token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role || normalizedUserType,
      permissions: user.permissions || [],
      userType: normalizedUserType,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const userObj = user.toObject();
    delete userObj.password;

    logger.info('Successful login', {
      userId: user._id,
      email: user.email,
      role: user.role,
      userType: normalizedUserType,
      ip,
    });

    return {
      success: true,
      user: userObj,
      token,
      expiresIn: config.jwt.expiresIn,
    };
  };

  /**
   * Refresh JWT token
   */
  refreshTokenService = async (currentUser) => {
    const tokenPayload = {
      userId: currentUser.id || currentUser.userId || currentUser._id,
      email: currentUser.email,
      role: currentUser.role,
      permissions: currentUser.permissions || [],
      userType: currentUser.userType || currentUser.role,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return {
      token,
      expiresIn: config.jwt.expiresIn,
    };
  };
}

export default new AuthService();
