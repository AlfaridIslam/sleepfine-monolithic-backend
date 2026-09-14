import express from 'express';
import { authenticate, authorize, requirePermission } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';
import {
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
  healthCheck,
} from '../controllers/adminController.js';

const router = express.Router();

// ==================== HEALTH & TEST ROUTES ====================
router.get('/health', healthCheck);

// ==================== DASHBOARD & STATS ROUTES ====================
router.get('/dashboard',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getAdminDashboard
);

router.get('/stats/sales',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getSalesStats
);

router.get('/stats/accounts',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getAccountsStats
);

router.get('/stats/logistics',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getLogisticsStats
);

router.get('/stats/users',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_users'),
  getUserStats
);

// ==================== USER MANAGEMENT ROUTES ====================
router.get('/users',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_users'),
  getAllUsers
);

router.get('/users/:userId',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_users'),
  getAllUsers
);

router.patch('/users/:userId',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_users'),
  validateRequest(businessSchemas.updateUser),
  getAllUsers
);

// ==================== SYSTEM SETTINGS ROUTES ====================
router.get('/settings',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_system'),
  getSystemSettings
);

router.get('/settings/:category',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_system'),
  getSystemSettings
);

router.patch('/settings/:settingKey',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('manage_system'),
  validateRequest(businessSchemas.updateSystemSetting),
  updateSystemSetting
);

// ==================== AUDIT LOG ROUTES ====================
router.get('/audit-logs',
  authenticate,
  authorize(['admin', 'super_admin']),
  getAuditLogs
);

// ==================== REPORTING ROUTES ====================
router.get('/reports/system',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getSystemReport
);

router.get('/reports/performance',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getPerformanceMetrics
);

router.get('/reports/health',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('view_reports'),
  getSystemHealth
);

export default router;
