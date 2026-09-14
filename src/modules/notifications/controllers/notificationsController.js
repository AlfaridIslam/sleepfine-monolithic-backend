import notificationsService from '../services/notificationsService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/apiResponse.js';
import logger from '../../../utils/logger.js';

// ==================== NOTIFICATION MANAGEMENT ====================

// Create notification
export const createNotification = asyncHandler(async (req, res) => {
  const { type, title, message, priority, channels, recipients, relatedEntity, metadata } = req.body;
  const createdBy = req.user?._id || req.user?.id;

  const notificationData = {
    type,
    title,
    message,
    priority: priority || 'medium',
    channels: channels || ['in_app'],
    recipients,
    relatedEntity: relatedEntity || {},
    metadata: metadata || {}
  };

  const notification = await notificationsService.createNotificationService(
    notificationData,
    createdBy
  );

  logger.info(`Notification created by user: ${createdBy}, ID: ${notification.notificationId}`);

  res.status(201).json(
    new ApiResponse(201, notification, 'Notification created successfully')
  );
});

// Create notification from template
export const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateType, variables, recipients } = req.body;
  const createdBy = req.user?._id || req.user?.id;

  const notification = await notificationsService.createFromTemplateService(
    templateType,
    variables,
    recipients,
    createdBy
  );

  logger.info(`Template notification created: ${templateType} by user: ${createdBy}`);

  res.status(201).json(
    new ApiResponse(201, notification, 'Template notification created successfully')
  );
});

// Get notifications with filtering
export const getNotifications = asyncHandler(async (req, res) => {
  const {
    type,
    status,
    priority,
    userId,
    role,
    orderId,
    entityType,
    isRead,
    isSystemGenerated,
    createdByModel,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10
  } = req.query;

  const filters = {
    type,
    status,
    priority,
    userId,
    role,
    orderId,
    entityType,
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
    isSystemGenerated: isSystemGenerated !== undefined ? (isSystemGenerated === 'true' || isSystemGenerated === true) : undefined,
    createdByModel,
    dateFrom,
    dateTo
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await notificationsService.getNotificationsService(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Notifications retrieved successfully')
  );
});

// Get notification by ID
export const getNotificationById = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await notificationsService.getNotificationByIdService(notificationId);

  if (!notification) {
    return res.status(404).json(
      new ApiResponse(404, null, 'Notification not found')
    );
  }

  res.status(200).json(
    new ApiResponse(200, notification, 'Notification retrieved successfully')
  );
});

// Get user notifications
export const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { isRead, type, priority, page = 1, limit = 10 } = req.query;

  const filters = {
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
    type,
    priority
  };

  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await notificationsService.getUserNotificationsService(
    userId,
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.status(200).json(
    new ApiResponse(200, result, 'User notifications retrieved successfully')
  );
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user?._id || req.user?.id;

  const notification = await notificationsService.markAsReadService(notificationId, userId);

  logger.info(`Notification marked as read: ${notificationId} by user: ${userId}`);

  res.status(200).json(
    new ApiResponse(200, notification, 'Notification marked as read successfully')
  );
});

// ==================== WHATSAPP INTEGRATION ====================

// Generate WhatsApp share data
export const getWhatsAppShareData = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const shareData = await notificationsService.generateWhatsAppShareData(notificationId);

  res.status(200).json(
    new ApiResponse(200, shareData, 'WhatsApp share data generated successfully')
  );
});

// Create order notification for WhatsApp
export const createOrderNotification = asyncHandler(async (req, res) => {
  const orderData = req.body;
  const createdBy = req.user?._id || req.user?.id;

  const notification = await notificationsService.createOrderNotificationService(
    orderData,
    createdBy
  );

  logger.info(`Order notification created for order: ${orderData.orderId}`);

  res.status(201).json(
    new ApiResponse(201, notification, 'Order notification created successfully')
  );
});

// Create gatepass notification for WhatsApp
export const createGatepassNotification = asyncHandler(async (req, res) => {
  const gatepassData = req.body;
  const createdBy = req.user?._id || req.user?.id;

  const notification = await notificationsService.createGatepassNotificationService(
    gatepassData,
    createdBy
  );

  logger.info(`Gatepass notification created for gatepass: ${gatepassData.gatepassId}`);

  res.status(201).json(
    new ApiResponse(201, notification, 'Gatepass notification created successfully')
  );
});

// Create delivery validation notification
export const createDeliveryValidationNotification = asyncHandler(async (req, res) => {
  const deliveryData = req.body;
  const createdBy = req.user?._id || req.user?.id;

  const notification = await notificationsService.createDeliveryValidationNotificationService(
    deliveryData,
    createdBy
  );

  logger.info(`Delivery validation notification created for order: ${deliveryData.orderId}`);

  res.status(201).json(
    new ApiResponse(201, notification, 'Delivery validation notification created successfully')
  );
});

// ==================== REAL-TIME FEATURES ====================

// Send system broadcast
export const sendSystemBroadcast = asyncHandler(async (req, res) => {
  const { title, message, priority = 'medium', targetRoles = [] } = req.body;

  const notification = await notificationsService.broadcastSystemNotification(title, message, priority, targetRoles);

  logger.info(`System broadcast sent: ${title} to roles: ${targetRoles.join(', ') || 'all'}`);

  res.status(200).json(
    new ApiResponse(200, { notification, title, message, priority, targetRoles }, 'System broadcast sent successfully')
  );
});

// ==================== TEMPLATE MANAGEMENT ====================

// Get notification templates
export const getNotificationTemplates = asyncHandler(async (req, res) => {
  const { category, type, channel, role } = req.query;

  const filters = { category, type, channel, role };
  
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const templates = await notificationsService.getNotificationTemplatesService(filters);

  res.status(200).json(
    new ApiResponse(200, templates, 'Notification templates retrieved successfully')
  );
});

// ==================== DASHBOARD & REPORTS ====================

// Get notifications dashboard data
export const getNotificationsDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role;
  const { role } = req.query;

  const targetRole = (userRole === 'admin' && role) ? role : userRole;
  const targetUserId = (userRole === 'admin' && !role) ? null : userId;

  const dashboard = await notificationsService.getNotificationsDashboard(targetUserId, targetRole);

  res.status(200).json(
    new ApiResponse(200, dashboard, 'Notifications dashboard data retrieved successfully')
  );
});

// Get notification statistics
export const getNotificationStats = asyncHandler(async (req, res) => {
  const stats = {
    totalNotifications: 0,
    sentNotifications: 0,
    readNotifications: 0,
    failedNotifications: 0,
    byType: {},
    byPriority: {},
    timeline: []
  };

  res.status(200).json(
    new ApiResponse(200, stats, 'Notification statistics retrieved successfully')
  );
});

// ==================== UTILITY ENDPOINTS ====================

// Health check for notifications service
export const healthCheck = asyncHandler(async (req, res) => {
  const health = {
    service: 'notifications',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    socketIO: !!notificationsService.socketIO,
    whatsappIntegration: 'manual',
    whatsappGroupUrl: notificationsService.whatsappGroupUrl
  };

  res.status(200).json(
    new ApiResponse(200, health, 'Notifications service is healthy')
  );
});

// Test notification creation
export const testNotification = asyncHandler(async (req, res) => {
  const { title = 'Test Notification', message = 'This is a test notification' } = req.body;
  const userId = req.user?._id || req.user?.id;

  const notificationData = {
    type: 'system_alert',
    title,
    message,
    priority: 'low',
    channels: ['in_app'],
    recipients: [{ 
      userId, 
      role: req.user?.role || 'admin', 
      userModel: 'Admin' 
    }],
    relatedEntity: {
      entityType: 'system',
      entityId: 'test'
    },
    metadata: {
      isTest: true
    }
  };

  const notification = await notificationsService.createNotificationService(notificationData, userId);

  res.status(201).json(
    new ApiResponse(201, notification, 'Test notification created successfully')
  );
});
