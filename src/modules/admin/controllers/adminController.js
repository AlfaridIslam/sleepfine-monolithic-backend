import adminService from '../services/adminService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/response.js';
import logger from '../../../utils/logger.js';

// ==================== DASHBOARD MANAGEMENT ====================

// Get comprehensive admin dashboard
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const adminId = req.user?.id || req.user?._id;
  const { startDate, endDate } = req.query;

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const dashboard = await adminService.getDashboardDataService(adminId, dateRange);

  return ApiResponse.success(res, 200, 'Admin dashboard data retrieved successfully', dashboard);
});

// Get sales statistics
export const getSalesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await adminService.getSalesStatsService(start, end);

  return ApiResponse.success(res, 200, 'Sales statistics retrieved successfully', stats);
});

// Get accounts statistics
export const getAccountsStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await adminService.getAccountsStatsService(start, end);

  return ApiResponse.success(res, 200, 'Accounts statistics retrieved successfully', stats);
});

// Get logistics statistics
export const getLogisticsStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await adminService.getLogisticsStatsService(start, end);

  return ApiResponse.success(res, 200, 'Logistics statistics retrieved successfully', stats);
});

// ==================== USER MANAGEMENT ====================

// Get all users across services
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    userType,
    isActive,
    status,
    search,
    page = 1,
    limit = 10
  } = req.query;

  const filters = {
    userType,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    status,
    search
  };

  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await adminService.getAllUsersService(
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  return ApiResponse.success(res, 200, 'Users retrieved successfully', result);
});

// Get user statistics
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getUserStatsService();
  return ApiResponse.success(res, 200, 'User statistics retrieved successfully', stats);
});

// ==================== SYSTEM SETTINGS MANAGEMENT ====================

// Get system settings
export const getSystemSettings = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const settings = await adminService.getSystemSettingsService(category);
  return ApiResponse.success(res, 200, 'System settings retrieved successfully', settings);
});

// Update system setting
export const updateSystemSetting = asyncHandler(async (req, res) => {
  const { settingKey } = req.params;
  const { value } = req.body;
  const updatedBy = req.user?.id || req.user?._id;

  const setting = await adminService.updateSystemSettingService(settingKey, value, updatedBy);
  logger.info(`System setting updated: ${settingKey} by user: ${updatedBy}`);

  return ApiResponse.success(res, 200, 'System setting updated successfully', setting);
});

// ==================== AUDIT LOG MANAGEMENT ====================

// Get audit logs
export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    service,
    actionType,
    resource,
    severity,
    status,
    isReviewed,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10
  } = req.query;

  const filters = {
    userId,
    service,
    actionType,
    resource,
    severity,
    status,
    isReviewed: isReviewed !== undefined ? isReviewed === 'true' : undefined,
    dateFrom,
    dateTo
  };

  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await adminService.getAuditLogsService(
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  return ApiResponse.success(res, 200, 'Audit logs retrieved successfully', result);
});

// ==================== REPORTS & ANALYTICS ====================

// Get comprehensive system report
export const getSystemReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, reportType = 'overview' } = req.query;

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const dashboard = await adminService.getDashboardDataService(null, dateRange);

  const report = {
    reportType,
    generatedAt: new Date().toISOString(),
    generatedBy: req.user?.id || req.user?._id,
    period: dashboard.period,
    summary: dashboard.overview,
    detailed: {
      sales: dashboard.sales,
      accounts: dashboard.accounts,
      logistics: dashboard.logistics,
      users: dashboard.users
    }
  };

  return ApiResponse.success(res, 200, 'System report generated successfully', report);
});

// Get performance metrics
export const getPerformanceMetrics = asyncHandler(async (req, res) => {
  const metrics = {
    system: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: 'connected',
      name: 'MongoDB'
    },
    cache: {
      status: 'connected',
      name: 'Redis'
    }
  };

  return ApiResponse.success(res, 200, 'Performance metrics retrieved successfully', metrics);
});

// Get system health
export const getSystemHealth = asyncHandler(async (req, res) => {
  const health = {
    service: 'admin',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    features: {
      userManagement: true,
      systemSettings: true,
      auditLogging: true,
      dashboard: true,
      reporting: true,
      monitoring: true
    }
  };

  return ApiResponse.success(res, 200, 'Admin service is healthy', health);
});

// Health check endpoint
export const healthCheck = asyncHandler(async (req, res) => {
  return ApiResponse.healthCheck(res, {
    service: 'admin',
    version: '1.0.0'
  });
});

export default {
  getAdminDashboard,
  getSalesStats,
  getAccountsStats,
  getLogisticsStats,
  getAllUsers,
  getUserStats,
  getSystemSettings,
  updateSystemSetting,
  getAuditLogs,
  getSystemReport,
  getPerformanceMetrics,
  getSystemHealth,
  healthCheck
};
