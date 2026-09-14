import Admin from '../models/Admin.js';
import SystemSettings from '../models/SystemSettings.js';
import AuditLog from '../models/AuditLog.js';
import { cacheService } from '../../../config/db.js';
import logger from '../../../utils/logger.js';

class AdminService {
  constructor() {
    this.cachePrefix = 'admin:';
    this.defaultCacheTTL = 3600;
  }

  // Helper to dynamically get models from other modules
  async getModel(moduleName, modelName) {
    try {
      const mod = await import(`../../${moduleName}/models/${modelName}.js`);
      return mod.default;
    } catch (err) {
      return null;
    }
  }

  // Get comprehensive dashboard data
  getDashboardDataService = async (adminId = null, dateRange = {}) => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : startOfMonth;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : endOfMonth;

      const [salesStats, accountsStats, logisticsStats, userStats] = await Promise.all([
        this.getSalesStatsService(startDate, endDate),
        this.getAccountsStatsService(startDate, endDate),
        this.getLogisticsStatsService(startDate, endDate),
        this.getUserStatsService()
      ]);

      return {
        period: { startDate, endDate },
        overview: {
          totalRevenue: accountsStats.totalRevenue || 0,
          totalOrders: salesStats.totalOrders || 0,
          totalUsers: userStats.totalUsers || 0,
          pendingPayments: accountsStats.pendingAmount || 0,
          activeGatepasses: logisticsStats.activeGatepasses || 0
        },
        sales: salesStats,
        accounts: accountsStats,
        logistics: logisticsStats,
        users: userStats
      };
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  };

  // Get sales statistics
  getSalesStatsService = async (startDate, endDate) => {
    try {
      const Order = await this.getModel('sales', 'Order');
      if (!Order) {
        return { totalOrders: 0, totalRevenue: 0, completedOrders: 0, pendingOrders: 0, averageOrderValue: 0 };
      }

      const salesAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$orderDetails.totalAmount' },
            completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            averageOrderValue: { $avg: '$orderDetails.totalAmount' }
          }
        }
      ]);

      return salesAgg[0] || { totalOrders: 0, totalRevenue: 0, completedOrders: 0, pendingOrders: 0, averageOrderValue: 0 };
    } catch (error) {
      logger.error('Error getting sales stats:', error);
      return { totalOrders: 0, totalRevenue: 0, completedOrders: 0, pendingOrders: 0, averageOrderValue: 0 };
    }
  };

  // Get accounts statistics
  getAccountsStatsService = async (startDate, endDate) => {
    try {
      const Payment = await this.getModel('accounts', 'Payment');
      if (!Payment) {
        return { totalPayments: 0, totalAmount: 0, completedAmount: 0, pendingAmount: 0, verifiedPayments: 0, totalRevenue: 0 };
      }

      const paymentStats = await Payment.aggregate([
        { $match: { collectedAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            completedAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
            pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
            verifiedPayments: { $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] } }
          }
        }
      ]);

      return {
        ...paymentStats[0] || { totalPayments: 0, totalAmount: 0, completedAmount: 0, pendingAmount: 0, verifiedPayments: 0 },
        totalRevenue: (paymentStats[0]?.completedAmount || 0)
      };
    } catch (error) {
      logger.error('Error getting accounts stats:', error);
      return { totalPayments: 0, totalAmount: 0, completedAmount: 0, pendingAmount: 0, verifiedPayments: 0, totalRevenue: 0 };
    }
  };

  // Get logistics statistics
  getLogisticsStatsService = async (startDate, endDate) => {
    try {
      const Gatepass = await this.getModel('logistics', 'Gatepass');
      if (!Gatepass) {
        return { totalGatepasses: 0, activeGatepasses: 0, completedGatepasses: 0, totalDeliveries: 0 };
      }

      const logisticsAgg = await Gatepass.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalGatepasses: { $sum: 1 },
            activeGatepasses: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completedGatepasses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            totalDeliveries: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } }
          }
        }
      ]);

      return logisticsAgg[0] || { totalGatepasses: 0, activeGatepasses: 0, completedGatepasses: 0, totalDeliveries: 0 };
    } catch (error) {
      logger.error('Error getting logistics stats:', error);
      return { totalGatepasses: 0, activeGatepasses: 0, completedGatepasses: 0, totalDeliveries: 0 };
    }
  };

  // Get user statistics
  getUserStatsService = async () => {
    try {
      const Salesman = await this.getModel('sales', 'Salesman');
      const Accountant = await this.getModel('accounts', 'Accountant');
      const Logistics = await this.getModel('logistics', 'Logistics');

      const [adminCount, salesmanCount, accountantCount, logisticsCount] = await Promise.all([
        Admin.countDocuments({ isActive: true }),
        Salesman ? Salesman.countDocuments({ isActive: true }) : 0,
        Accountant ? Accountant.countDocuments({ isActive: true }) : 0,
        Logistics ? Logistics.countDocuments({ isActive: true }) : 0
      ]);

      return {
        totalUsers: adminCount + salesmanCount + accountantCount + logisticsCount,
        adminCount,
        salesmanCount,
        accountantCount,
        logisticsCount
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return { totalUsers: 0, adminCount: 0, salesmanCount: 0, accountantCount: 0, logisticsCount: 0 };
    }
  };

  // Get all users across services
  getAllUsersService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;
      const userTypes = filters.userType ? [filters.userType] : ['admin', 'salesman', 'accountant', 'logistics'];
      
      let allUsers = [];
      let totalCount = 0;

      for (const userType of userTypes) {
        let Model = null;
        
        switch (userType) {
          case 'admin': Model = Admin; break;
          case 'salesman': Model = await this.getModel('sales', 'Salesman'); break;
          case 'accountant': Model = await this.getModel('accounts', 'Accountant'); break;
          case 'logistics': Model = await this.getModel('logistics', 'Logistics'); break;
          default: continue;
        }

        if (!Model) continue;

        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.status) query.status = filters.status;

        const [users, count] = await Promise.all([
          Model.find(query).select('-password').sort({ createdAt: -1 }).limit(100),
          Model.countDocuments(query)
        ]);

        allUsers = allUsers.concat(users.map(user => ({ ...user.toObject(), userType })));
        totalCount += count;
      }

      return {
        users: allUsers.slice(skip, skip + limit),
        pagination: {
          page, limit, total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching all users:', error);
      throw error;
    }
  };

  // Get system settings
  getSystemSettingsService = async (category = null) => {
    try {
      return category ? 
        await SystemSettings.findByCategory(category) : 
        await SystemSettings.findByAccessLevel('admin');
    } catch (error) {
      logger.error('Error fetching system settings:', error);
      throw error;
    }
  };

  // Update system setting
  updateSystemSettingService = async (settingKey, value, updatedBy) => {
    try {
      const setting = await SystemSettings.updateSetting(settingKey, value, updatedBy);
      logger.info(`System setting updated: ${settingKey} by ${updatedBy}`);
      return setting;
    } catch (error) {
      logger.error('Error updating system setting:', error);
      throw error;
    }
  };

  // Get audit logs
  getAuditLogsService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const query = {};
      if (filters.userId) query.userId = filters.userId;
      if (filters.service) query.service = filters.service;
      if (filters.actionType) query.actionType = filters.actionType;
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const skip = (page - 1) * limit;
      
      const [logs, total] = await Promise.all([
        AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  };

  // Create audit log with service-layer calculations and transaction support
  createAuditLog = async (data, session = null) => {
    try {
      // 1. Generate logId if omitted
      let logId = data.logId;
      if (!logId) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        logId = `LOG${timestamp}${random}`;
      }

      // 2. Compute retentionDate if omitted (default 365 days)
      const retentionDays = data.retentionDays || 365;
      const retentionDate = data.retentionDate || new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000));

      // 3. Compute severity if omitted or defaulted to 'medium'
      let severity = data.severity;
      if (!severity || severity === 'medium') {
        if (['delete', 'approve', 'reject'].includes(data.actionType) && 
            ['admin', 'system'].includes(data.service)) {
          severity = 'critical';
        } else if (data.status === 'error' || 
            data.category === 'security' || 
            data.actionType === 'delete' ||
            (data.actionType === 'update' && data.resource?.includes('user'))) {
          severity = 'high';
        } else if (['login', 'logout'].includes(data.actionType) || 
            data.category === 'authentication') {
          severity = 'medium';
        } else {
          severity = 'low';
        }
      }

      const auditPayload = {
        ...data,
        logId,
        retentionDate,
        severity
      };

      // 4. Persist with Mongoose session support
      let savedLog;
      if (session) {
        const created = await AuditLog.create([auditPayload], { session });
        savedLog = created[0];
      } else {
        savedLog = await AuditLog.create(auditPayload);
      }

      return savedLog;
    } catch (error) {
      logger.error('Error creating audit log in service:', error);
      throw error;
    }
  };

  createAuditLogService = this.createAuditLog;

  // Auth helper: find admin by email with password
  findAdminByEmailForAuth = async (email) => {
    return Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');
  };
}

export default new AdminService();
