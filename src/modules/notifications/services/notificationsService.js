import Notification from '../models/Notification.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import { cacheService } from '../../../config/db.js';
import webSocketService from '../../../config/websocket.js';
import logger from '../../../utils/logger.js';
import mongoose from 'mongoose';

class NotificationsService {
  constructor() {
    this.whatsappGroupUrl = 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE';
  }

  // Socket.IO getter for compatibility
  get socketIO() {
    return webSocketService.io;
  }

  initializeSocketIO = (io) => {
    logger.info('WebSocket is handled centrally via webSocketService');
  };

  // ==================== NOTIFICATION SERVICES ====================

  // Create notification with real-time delivery
  createNotificationService = async (notificationData, createdBy = null) => {
    try {
      const notificationId = this.generateNotificationId();
      
      const isSystemGenerated = notificationData.isSystemGenerated === true || 
        (!createdBy && !notificationData.createdBy) ||
        notificationData.type === 'system_alert';

      const effectiveCreatedBy = isSystemGenerated ? null : (createdBy || notificationData.createdBy);
      const effectiveCreatedByModel = isSystemGenerated 
        ? null 
        : (notificationData.createdByModel || this.getUserModel(effectiveCreatedBy));

      const notification = new Notification({
        notificationId,
        ...notificationData,
        isSystemGenerated,
        createdBy: effectiveCreatedBy,
        createdByModel: effectiveCreatedByModel,
        status: 'pending'
      });

      const savedNotification = await notification.save();
      
      // Cache the notification
      await cacheService.set(`notification:${savedNotification._id}`, savedNotification, 3600);
      
      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(savedNotification);
      
      // Process delivery channels
      await this.processNotificationDelivery(savedNotification);
      
      logger.info(`Notification created successfully: ${notificationId}`);
      return savedNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  };

  // Create notification from template
  createFromTemplateService = async (templateType, variables, recipients, createdBy = null) => {
    try {
      const template = await NotificationTemplate.findByType(templateType);
      if (!template) {
        throw new Error(`Template not found: ${templateType}`);
      }

      const validationErrors = template.validateVariables(variables);
      if (validationErrors.length > 0) {
        throw new Error(`Template validation failed: ${validationErrors.join(', ')}`);
      }

      const title = template.renderTemplate('title', variables);
      const message = template.renderTemplate('message', variables);

      const notificationData = {
        type: template.type,
        title,
        message,
        priority: template.priority,
        channels: template.channels,
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        relatedEntity: variables.relatedEntity || {},
        metadata: {
          templateId: template.templateId,
          templateVersion: template.version,
          variables,
          category: template.category
        }
      };

      const notification = await this.createNotificationService(notificationData, createdBy);
      
      if (template.channels.includes('whatsapp')) {
        const whatsappData = template.generateWhatsAppShareData(variables);
        notification.whatsappShareData = whatsappData;
        await cacheService.set(`whatsapp_share:${notification._id}`, whatsappData, 3600);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification from template:', error);
      throw error;
    }
  };

  generateNotificationId = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `NOTIF${timestamp}${random}`;
  };

  getUserModel = (userId) => {
    return 'Admin';
  };

  // Send real-time notification via Socket.IO
  sendRealTimeNotification = async (notification) => {
    try {
      if (notification.recipients && notification.recipients.length > 0) {
        notification.recipients.forEach(recipient => {
          const payload = {
            notificationId: notification.notificationId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            createdAt: notification.createdAt,
            relatedEntity: notification.relatedEntity
          };

          if (recipient.userId) {
            webSocketService.sendToUser(recipient.userId.toString(), 'new_notification', payload);
          }
          if (recipient.role) {
            webSocketService.sendToRole(recipient.role, 'new_notification', payload);
          }
        });
      }

      logger.info(`Real-time notification dispatched: ${notification.notificationId}`);
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
    }
  };

  processNotificationDelivery = async (notification) => {
    try {
      notification.status = 'sent';
      await notification.save();
      logger.info(`Notification delivery processed: ${notification.notificationId}`);
    } catch (error) {
      logger.error('Error processing notification delivery:', error);
    }
  };

  // ==================== WHATSAPP INTEGRATION SERVICES ====================

  generateWhatsAppShareData = async (notificationId) => {
    try {
      const cachedData = await cacheService.get(`whatsapp_share:${notificationId}`);
      if (cachedData) {
        return cachedData;
      }

      const query = mongoose.isValidObjectId(notificationId)
        ? { _id: notificationId }
        : { notificationId };

      const notification = await Notification.findOne(query);
      if (!notification) {
        throw new Error('Notification not found');
      }

      let whatsappMessage = notification.message;
      whatsappMessage = this.addWhatsAppEmojis(whatsappMessage, notification.type);

      const shareData = {
        groupUrl: this.whatsappGroupUrl,
        message: whatsappMessage,
        shareUrl: `${this.whatsappGroupUrl}&text=${encodeURIComponent(whatsappMessage)}`,
        instructions: 'Please manually share this information in the WhatsApp group',
        notificationId: notification.notificationId,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt
      };

      await cacheService.set(`whatsapp_share:${notificationId}`, shareData, 3600);
      return shareData;
    } catch (error) {
      logger.error(`Error generating WhatsApp share data for ${notificationId}:`, error);
      throw error;
    }
  };

  createOrderNotificationService = async (orderData, createdBy) => {
    try {
      const whatsappMessage = `🆕 New Order Created!

Order ID: ${orderData.orderId}
Customer: ${orderData.customer?.name || 'N/A'}
Total Amount: ₹${orderData.orderDetails?.totalAmount || 0}
Items: ${orderData.items?.length || 0} products
Salesman: ${orderData.salesmanName || 'N/A'}
Date: ${new Date().toLocaleString('en-IN')}

Please start manufacturing process.`;

      const notificationData = {
        type: 'order_update',
        title: 'New Order Created',
        message: whatsappMessage,
        priority: 'high',
        channels: ['whatsapp', 'in_app'],
        recipients: [
          { role: 'logistics', userModel: 'Logistics' },
          { role: 'admin', userModel: 'Admin' }
        ],
        relatedEntity: {
          entityType: 'order',
          entityId: orderData._id,
          orderId: orderData.orderId
        }
      };

      const notification = await this.createNotificationService(notificationData, createdBy);
      
      const whatsappData = {
        groupUrl: this.whatsappGroupUrl,
        message: whatsappMessage,
        shareUrl: `${this.whatsappGroupUrl}&text=${encodeURIComponent(whatsappMessage)}`,
        instructions: 'Please manually share this in the logistics WhatsApp group',
        type: 'order_created'
      };
      
      await cacheService.set(`whatsapp_share:${notification._id}`, whatsappData, 3600);
      notification.whatsappShareData = whatsappData;

      return notification;
    } catch (error) {
      logger.error('Error creating order notification:', error);
      throw error;
    }
  };

  createGatepassNotificationService = async (gatepassData, createdBy) => {
    try {
      const whatsappMessage = `🎫 New Gatepass Created!

Gatepass ID: ${gatepassData.gatepassId}
Order ID: ${gatepassData.orderId}
Customer: ${gatepassData.order?.customer?.name || 'N/A'}
Total Amount: ₹${gatepassData.paymentDetails?.totalAmount || 0}
Driver: ${gatepassData.deliveryDetails?.driver?.fullName || 'Not Assigned'}
Vehicle: ${gatepassData.deliveryDetails?.vehicleNumber || 'N/A'}
Valid Until: ${gatepassData.validUntil ? new Date(gatepassData.validUntil).toLocaleString('en-IN') : 'N/A'}
Date: ${new Date().toLocaleString('en-IN')}

Ready for delivery!`;

      const notificationData = {
        type: 'delivery_update',
        title: 'Gatepass Created',
        message: whatsappMessage,
        priority: 'high',
        channels: ['whatsapp', 'in_app'],
        recipients: [
          { role: 'driver', userModel: 'Driver' },
          { role: 'admin', userModel: 'Admin' }
        ],
        relatedEntity: {
          entityType: 'gatepass',
          entityId: gatepassData._id,
          orderId: gatepassData.orderId
        }
      };

      const notification = await this.createNotificationService(notificationData, createdBy);
      
      const whatsappData = {
        groupUrl: this.whatsappGroupUrl,
        message: whatsappMessage,
        shareUrl: `${this.whatsappGroupUrl}&text=${encodeURIComponent(whatsappMessage)}`,
        instructions: 'Please manually share this in the delivery WhatsApp group',
        type: 'gatepass_created'
      };
      
      await cacheService.set(`whatsapp_share:${notification._id}`, whatsappData, 3600);
      notification.whatsappShareData = whatsappData;

      return notification;
    } catch (error) {
      logger.error('Error creating gatepass notification:', error);
      throw error;
    }
  };

  createDeliveryValidationNotificationService = async (deliveryData, createdBy) => {
    try {
      const whatsappMessage = `✅ Delivery Completed!

Order ID: ${deliveryData.orderId}
Gatepass ID: ${deliveryData.gatepassId}
Customer: ${deliveryData.customerName}
Delivery Date: ${new Date().toLocaleString('en-IN')}
Driver: ${deliveryData.driverName}
Payment Received: ₹${deliveryData.paymentReceived || 0}
Payment Method: ${deliveryData.paymentMethod || 'Cash'}

Order successfully delivered and payment collected!`;

      const notificationData = {
        type: 'delivery_update',
        title: 'Delivery Completed',
        message: whatsappMessage,
        priority: 'high',
        channels: ['whatsapp', 'in_app'],
        recipients: [
          { role: 'salesman', userModel: 'Salesman' },
          { role: 'accounts', userModel: 'Accountant' },
          { role: 'admin', userModel: 'Admin' }
        ],
        relatedEntity: {
          entityType: 'order',
          entityId: deliveryData.orderId,
          orderId: deliveryData.orderId
        }
      };

      const notification = await this.createNotificationService(notificationData, createdBy);
      
      const whatsappData = {
        groupUrl: this.whatsappGroupUrl,
        message: whatsappMessage,
        shareUrl: `${this.whatsappGroupUrl}&text=${encodeURIComponent(whatsappMessage)}`,
        instructions: 'Please manually share this delivery confirmation in the WhatsApp group',
        type: 'delivery_completed'
      };
      
      await cacheService.set(`whatsapp_share:${notification._id}`, whatsappData, 3600);
      notification.whatsappShareData = whatsappData;

      return notification;
    } catch (error) {
      logger.error('Error creating delivery validation notification:', error);
      throw error;
    }
  };

  addWhatsAppEmojis = (message, type) => {
    const emojiMap = {
      'order_update': '📋',
      'payment_update': '💰',
      'delivery_update': '🚚',
      'manufacturing_update': '🏭',
      'system_alert': '⚠️',
      'reminder': '⏰',
      'announcement': '📢'
    };

    const emoji = emojiMap[type] || '📌';
    return message.startsWith(emoji) ? message : `${emoji} ${message}`;
  };

  // Get notifications with filtering
  getNotificationsService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const query = {};
      
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.userId) query['recipients.userId'] = filters.userId;
      if (filters.role) query['recipients.role'] = filters.role;
      if (filters.orderId) query['relatedEntity.orderId'] = filters.orderId;
      if (filters.entityType) query['relatedEntity.entityType'] = filters.entityType;
      if (filters.isRead !== undefined) query['recipients.isRead'] = filters.isRead;
      if (filters.isSystemGenerated !== undefined) {
        query.isSystemGenerated = filters.isSystemGenerated === true || filters.isSystemGenerated === 'true';
      } else if (filters.createdByModel === 'System') {
        query.isSystemGenerated = true;
      } else if (filters.createdByModel) {
        query.createdByModel = filters.createdByModel;
      }
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const skip = (page - 1) * limit;
      
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email'),
        Notification.countDocuments(query)
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  };

  // Get notification by ID
  getNotificationByIdService = async (notificationId) => {
    try {
      const query = mongoose.isValidObjectId(notificationId)
        ? { _id: notificationId }
        : { notificationId };

      return await Notification.findOne(query)
        .populate('createdBy', 'firstName lastName email');
    } catch (error) {
      logger.error(`Error fetching notification ${notificationId}:`, error);
      throw error;
    }
  };

  // Get user-specific notifications
  getUserNotificationsService = async (userId, filters = {}, page = 1, limit = 10) => {
    try {
      const query = {
        'recipients.userId': userId
      };

      if (filters.isRead !== undefined) {
        query['recipients.isRead'] = filters.isRead;
      }
      if (filters.type) {
        query.type = filters.type;
      }
      if (filters.priority) {
        query.priority = filters.priority;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(query)
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error(`Error fetching user notifications for ${userId}:`, error);
      throw error;
    }
  };

  // Mark notification as read
  markAsReadService = async (notificationId, userId) => {
    try {
      const query = mongoose.isValidObjectId(notificationId)
        ? { _id: notificationId }
        : { notificationId };

      const notification = await Notification.findOne(query);
      if (!notification) {
        throw new Error('Notification not found');
      }

      let updated = false;
      notification.recipients.forEach(recipient => {
        if (!userId || recipient.userId?.toString() === userId.toString()) {
          recipient.isRead = true;
          recipient.readAt = new Date();
          updated = true;
        }
      });

      if (!updated && notification.recipients.length > 0) {
        notification.recipients[0].isRead = true;
        notification.recipients[0].readAt = new Date();
      }

      return await notification.save();
    } catch (error) {
      logger.error(`Error marking notification read ${notificationId}:`, error);
      throw error;
    }
  };

  // Broadcast system notification
  broadcastSystemNotification = async (title, message, priority = 'medium', targetRoles = []) => {
    try {
      const notificationData = {
        type: 'system_alert',
        title,
        message,
        priority,
        channels: ['in_app'],
        recipients: targetRoles.map(role => ({
          role,
          userModel: 'Admin'
        })),
        relatedEntity: {
          entityType: 'system',
          entityId: 'broadcast'
        },
        isSystemGenerated: true
      };

      const notification = await this.createNotificationService(notificationData, null);

      if (targetRoles.length === 0) {
        webSocketService.sendToAll('system-broadcast', { title, message, priority });
      } else {
        targetRoles.forEach(role => {
          webSocketService.sendToRole(role, 'system-broadcast', { title, message, priority });
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error broadcasting system notification:', error);
      throw error;
    }
  };

  // Get notification templates
  getNotificationTemplatesService = async (filters = {}) => {
    try {
      return await NotificationTemplate.find({ ...filters, isActive: true })
        .sort({ category: 1, type: 1 });
    } catch (error) {
      logger.error('Error fetching notification templates:', error);
      throw error;
    }
  };

  // Get notifications dashboard data
  getNotificationsDashboard = async (userId = null, role = null) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      let matchQuery = {};
      if (userId && mongoose.isValidObjectId(userId)) {
        matchQuery['recipients.userId'] = new mongoose.Types.ObjectId(userId);
      } else if (role) {
        matchQuery['recipients.role'] = role;
      }

      const [overallStats, todayStats] = await Promise.all([
        Notification.getStats(),
        Notification.aggregate([
          { $match: { ...matchQuery, createdAt: { $gte: startOfDay } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              unreadCount: {
                $sum: { $cond: [{ $eq: ['$recipients.isRead', false] }, 1, 0] }
              }
            }
          }
        ])
      ]);

      return {
        overallStats,
        today: todayStats[0] || { count: 0, unreadCount: 0 }
      };
    } catch (error) {
      logger.error('Error fetching notifications dashboard:', error);
      throw error;
    }
  };
}

export default new NotificationsService();
