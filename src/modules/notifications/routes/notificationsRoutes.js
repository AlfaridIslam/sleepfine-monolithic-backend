import express from 'express';
import { authenticate, authorize, requirePermission } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';
import {
  createNotification,
  createFromTemplate,
  getNotifications,
  getNotificationById,
  getUserNotifications,
  markAsRead,
  getWhatsAppShareData,
  createOrderNotification,
  createGatepassNotification,
  createDeliveryValidationNotification,
  sendSystemBroadcast,
  getNotificationTemplates,
  getNotificationsDashboard,
  getNotificationStats,
  healthCheck,
  testNotification
} from '../controllers/notificationsController.js';

const router = express.Router();

// ==================== HEALTH & TEST ROUTES ====================

// Health check endpoint
router.get('/health', healthCheck);

// Test notification endpoint (development only)
router.post('/test',
  authenticate,
  authorize(['admin']),
  testNotification
);

// ==================== NOTIFICATION MANAGEMENT ROUTES ====================

// Create notification (supporting both / and /notifications)
router.post(['/', '/notifications'],
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts']),
  requirePermission('send_notifications'),
  validateRequest(businessSchemas.createNotification),
  createNotification
);

// Create notification from template
router.post(['/from-template', '/notifications/from-template'],
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts']),
  requirePermission('send_notifications'),
  validateRequest(businessSchemas.createFromTemplate),
  createFromTemplate
);

// Get user's notifications
router.get('/my-notifications',
  authenticate,
  getUserNotifications
);

// Get notifications with filtering (supporting both / and /notifications)
router.get(['/', '/notifications'],
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts', 'driver']),
  requirePermission('view_notifications'),
  getNotifications
);

// ==================== TEMPLATE MANAGEMENT ROUTES ====================

// Get notification templates
router.get('/templates',
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts']),
  requirePermission('view_notifications'),
  getNotificationTemplates
);

// ==================== DASHBOARD & REPORTS ROUTES ====================

// Get notifications dashboard data
router.get('/dashboard',
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts']),
  requirePermission('view_notifications'),
  getNotificationsDashboard
);

// Get notification statistics
router.get('/stats',
  authenticate,
  authorize(['admin']),
  requirePermission('view_notifications'),
  getNotificationStats
);

// Get notifications report
router.get('/reports',
  authenticate,
  authorize(['admin']),
  requirePermission('view_notifications'),
  getNotificationStats
);

// ==================== REAL-TIME FEATURES ROUTES ====================

// Send system broadcast notification
router.post('/broadcast',
  authenticate,
  authorize(['admin']),
  requirePermission('manage_notifications'),
  validateRequest(businessSchemas.systemBroadcast),
  sendSystemBroadcast
);

// ==================== WHATSAPP INTEGRATION ROUTES ====================

// Create order notification for WhatsApp sharing
router.post('/whatsapp/order',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('send_notifications'),
  validateRequest(businessSchemas.createOrderNotification),
  createOrderNotification
);

// Create gatepass notification for WhatsApp sharing
router.post('/whatsapp/gatepass',
  authenticate,
  authorize(['admin', 'logistics']),
  requirePermission('send_notifications'),
  validateRequest(businessSchemas.createGatepassNotification),
  createGatepassNotification
);

// Create delivery validation notification
router.post('/whatsapp/delivery',
  authenticate,
  authorize(['admin', 'driver', 'logistics']),
  requirePermission('send_notifications'),
  validateRequest(businessSchemas.createDeliveryNotification),
  createDeliveryValidationNotification
);

// ==================== PARAMETERIZED NOTIFICATION ROUTES ====================

// Mark notification as read
router.patch(['/:notificationId/read', '/notifications/:notificationId/read'],
  authenticate,
  markAsRead
);

// Get WhatsApp share data for manual sharing
router.get(['/:notificationId/whatsapp-share', '/notifications/:notificationId/whatsapp-share'],
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'driver']),
  requirePermission('send_notifications'),
  getWhatsAppShareData
);

// Get notification by ID (supporting both /:notificationId and /notifications/:notificationId)
router.get(['/:notificationId', '/notifications/:notificationId'],
  authenticate,
  authorize(['admin', 'salesman', 'logistics', 'accounts', 'driver']),
  requirePermission('view_notifications'),
  getNotificationById
);

export default router;
