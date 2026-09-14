import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Salesman from '../models/Salesman.js';
import StoreInvoice from '../models/StoreInvoice.js';
import notificationsService from '../../notifications/services/notificationsService.js';
import { cacheService } from '../../../config/db.js';
import logger from '../../../utils/logger.js';
import { runInTransaction } from '../../../utils/transaction.js';
import { generateStoreInvoicePDF, generateOrderPDF, generateWarrantyPDF } from '../utils/pdfGenerator.js';

class SalesService {
  // ==================== ORDER SERVICES ====================
  
  createOrderService = async (orderData, salesmanId) => {
    try {
      let savedOrder = null;

      await runInTransaction(async (session) => {
        const orderId = this.generateOrderId();
        
        const totalAmount = orderData.orderDetails?.totalAmount || orderData.totalAmount || 0;
        const advanceAmount = orderData.orderDetails?.advanceAmount || orderData.advanceAmount || 0;
        const pendingAmount = Math.max(0, totalAmount - advanceAmount);

        const order = new Order({
          orderId,
          salesman: salesmanId,
          ...orderData,
          orderDetails: {
            ...orderData.orderDetails,
            totalAmount,
            advanceAmount,
            pendingAmount,
          },
          status: orderData.status || 'draft',
          lastModifiedBy: salesmanId,
          lastModifiedByModel: 'Salesman'
        });

        // 1. Save order inside transaction session
        savedOrder = await order.save(session ? { session } : {});

        // 2. If advance payment is present, atomically record it in Accounts
        if (advanceAmount > 0 || (orderData.payment && orderData.payment.amount > 0)) {
          // Lazy load accountsService to prevent circular dependency
          const accountsService = (await import('../../accounts/services/accountsService.js')).default;

          const payAmount = advanceAmount || orderData.payment.amount;
          await accountsService.createPaymentService({
            orderId: savedOrder.orderId,
            order: savedOrder._id,
            amount: payAmount,
            method: orderData.paymentMethod || orderData.payment?.method || 'cash',
            status: 'completed',
            collectedBy: salesmanId,
            collectedByModel: 'Salesman',
            notes: `Advance payment for order ${savedOrder.orderId}`
          }, session);
        }
      });

      // 3. Cache operations occur strictly AFTER successful transaction commit
      if (savedOrder) {
        await cacheService.set(`order:${savedOrder._id}`, savedOrder, 3600);
        await cacheService.set(`order:${savedOrder.orderId}`, savedOrder, 3600);
        logger.info(`Order created successfully: ${savedOrder.orderId} by salesman: ${salesmanId}`);
      }

      return savedOrder;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  };

  getOrdersService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const cacheKey = `orders:${JSON.stringify(filters)}:${page}:${limit}`;
      
      const cachedOrders = await cacheService.get(cacheKey);
      if (cachedOrders) {
        return cachedOrders;
      }

      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.salesman) query.salesman = filters.salesman;
      if (filters.customerName) query['customer.name'] = { $regex: filters.customerName, $options: 'i' };
      if (filters.customerPhone) query['customer.phone'] = { $regex: filters.customerPhone, $options: 'i' };
      if (filters.priority) query.priority = filters.priority;
      if (filters.source) query.source = filters.source;
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('salesman', 'firstName lastName phone email'),
        Order.countDocuments(query)
      ]);

      const result = {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 900);
      return result;
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  };

  getOrderByIdService = async (orderId) => {
    try {
      const cachedOrder = await cacheService.get(`order:${orderId}`);
      if (cachedOrder) {
        return cachedOrder;
      }

      let order;
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId)
          .populate('salesman', 'firstName lastName phone email');
      } else {
        order = await Order.findOne({ orderId })
          .populate('salesman', 'firstName lastName phone email');
      }

      if (order) {
        await cacheService.set(`order:${orderId}`, order, 3600);
      }

      return order;
    } catch (error) {
      logger.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  };

  updateOrderService = async (orderId, updateData, userId, userRole) => {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          ...updateData,
          lastModifiedBy: userId,
          lastModifiedByModel: userRole,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!order) {
        throw new Error('Order not found');
      }

      await this.invalidateOrderCaches(orderId, order.orderId);
      logger.info(`Order updated: ${orderId} by ${userRole}: ${userId}`);
      return order;
    } catch (error) {
      logger.error(`Error updating order ${orderId}:`, error);
      throw error;
    }
  };

  updateOrderStatusService = async (orderId, status, userId, userRole) => {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { 
          status,
          lastModifiedBy: userId,
          lastModifiedByModel: userRole,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!order) {
        throw new Error('Order not found');
      }

      await this.invalidateOrderCaches(orderId, order.orderId);
      logger.info(`Order status updated: ${orderId} to ${status} by ${userRole}: ${userId}`);
      return order;
    } catch (error) {
      logger.error(`Error updating order status ${orderId}:`, error);
      throw error;
    }
  };

  addPaymentService = async (orderId, paymentData, userId, userRole, session = null) => {
    try {
      const query = mongoose.Types.ObjectId.isValid(orderId)
        ? Order.findById(orderId)
        : Order.findOne({ orderId });

      if (session) {
        query.session(session);
      }

      const order = await query;
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.payment) {
        order.payment = { transactions: [] };
      }
      if (!order.payment.transactions) {
        order.payment.transactions = [];
      }

      order.payment.transactions.push({
        amount: paymentData.amount,
        method: paymentData.method,
        transactionId: paymentData.transactionId,
        utrNumber: paymentData.utrNumber,
        status: 'completed',
        timestamp: new Date(),
        notes: paymentData.notes
      });

      const totalPaid = order.payment.transactions.reduce((sum, t) => sum + t.amount, 0);
      if (totalPaid >= order.orderDetails.totalAmount) {
        order.payment.status = 'completed';
      } else if (totalPaid > 0) {
        order.payment.status = 'partial';
      }

      order.orderDetails.pendingAmount = Math.max(0, order.orderDetails.totalAmount - totalPaid);
      order.lastModifiedBy = userId;
      order.lastModifiedByModel = userRole;
      order.updatedAt = new Date();

      const savedOrder = await order.save({ session });

      // Cache invalidation deferred post-commit if in transaction session
      if (!session) {
        await this.invalidateOrderCaches(savedOrder._id, savedOrder.orderId);
      }
      
      logger.info(`Payment added to order: ${orderId}, amount: ${paymentData.amount}`);
      return savedOrder;
    } catch (error) {
      logger.error(`Error adding payment to order ${orderId}:`, error);
      throw error;
    }
  };

  // ==================== SALESMAN SERVICES ====================
  
  createSalesmanService = async (salesmanData) => {
    try {
      const salesman = new Salesman(salesmanData);
      const savedSalesman = await salesman.save();
      await cacheService.set(`salesman:${savedSalesman._id}`, savedSalesman, 3600);
      logger.info(`Salesman created successfully: ${savedSalesman.employeeId}`);
      return savedSalesman;
    } catch (error) {
      logger.error('Error creating salesman:', error);
      throw error;
    }
  };

  getSalesmenService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const cacheKey = `salesmen:${JSON.stringify(filters)}:${page}:${limit}`;
      
      const cachedSalesmen = await cacheService.get(cacheKey);
      if (cachedSalesmen) {
        return cachedSalesmen;
      }

      const query = { isActive: true };
      
      if (filters.status) query.status = filters.status;
      if (filters.territory) query.assignedTerritory = filters.territory;
      if (filters.manager) query.manager = filters.manager;
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { employeeId: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      
      const [salesmen, total] = await Promise.all([
        Salesman.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Salesman.countDocuments(query)
      ]);

      const result = {
        salesmen,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      logger.error('Error fetching salesmen:', error);
      throw error;
    }
  };

  getSalesmanByIdService = async (salesmanId) => {
    try {
      const cachedSalesman = await cacheService.get(`salesman:${salesmanId}`);
      if (cachedSalesman) {
        return cachedSalesman;
      }

      const salesman = await Salesman.findById(salesmanId).select('-password');
      if (salesman) {
        await cacheService.set(`salesman:${salesmanId}`, salesman, 3600);
      }

      return salesman;
    } catch (error) {
      logger.error(`Error fetching salesman ${salesmanId}:`, error);
      throw error;
    }
  };

  getSalesmanOrdersService = async (salesmanId, page = 1, limit = 10, status = null) => {
    try {
      const query = { salesman: salesmanId };
      if (status && status !== 'all') {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(query)
      ]);

      return {
        orders,
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
      logger.error(`Error fetching orders for salesman ${salesmanId}:`, error);
      throw error;
    }
  };

  getSalesmanPerformanceService = async (salesmanId, period = 'monthly') => {
    try {
      const startDate = this.getPeriodStartDate(period);
      
      const performance = await Order.aggregate([
        { $match: { salesman: new mongoose.Types.ObjectId(salesmanId), createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$orderDetails.totalAmount' },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $in: ['$status', ['draft', 'confirmed', 'processing']] }, 1, 0] }
            },
            averageOrderValue: { $avg: '$orderDetails.totalAmount' }
          }
        }
      ]);

      return performance[0] || {
        totalOrders: 0,
        totalAmount: 0,
        deliveredOrders: 0,
        pendingOrders: 0,
        averageOrderValue: 0
      };
    } catch (error) {
      logger.error(`Error fetching performance for salesman ${salesmanId}:`, error);
      throw error;
    }
  };

  // ==================== REPORT SERVICES ====================
  
  generateSalesReport = async (dateRange, filters = {}) => {
    try {
      const { startDate, endDate } = dateRange;
      const query = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      if (filters.salesman) query.salesman = filters.salesman;
      if (filters.status) query.status = filters.status;
      if (filters.source) query.source = filters.source;

      return await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status',
              source: '$source'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$orderDetails.totalAmount' },
            advanceAmount: { $sum: '$orderDetails.advanceAmount' },
            pendingAmount: { $sum: '$orderDetails.pendingAmount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);
    } catch (error) {
      logger.error('Error generating sales report:', error);
      throw error;
    }
  };

  generatePerformanceReport = async (period, filters = {}) => {
    try {
      const startDate = this.getPeriodStartDate(period);
      
      return await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $lookup: {
            from: 'salesmen',
            localField: 'salesman',
            foreignField: '_id',
            as: 'salesmanInfo'
          }
        },
        { $unwind: '$salesmanInfo' },
        {
          $group: {
            _id: '$salesman',
            salesmanName: { $first: { $concat: ['$salesmanInfo.firstName', ' ', '$salesmanInfo.lastName'] } },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$orderDetails.totalAmount' },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            averageOrderValue: { $avg: '$orderDetails.totalAmount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  };

  getDashboardData = async (salesmanId = null) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      let matchQuery = {};
      if (salesmanId) {
        matchQuery.salesman = new mongoose.Types.ObjectId(salesmanId);
      }

      const [todayStats, monthStats, totalStats] = await Promise.all([
        Order.aggregate([
          { $match: { ...matchQuery, createdAt: { $gte: startOfDay } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              amount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: { ...matchQuery, createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              amount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalAmount: { $sum: '$orderDetails.totalAmount' },
              pendingAmount: { $sum: '$orderDetails.pendingAmount' }
            }
          }
        ])
      ]);

      return {
        today: todayStats[0] || { orders: 0, amount: 0 },
        month: monthStats[0] || { orders: 0, amount: 0 },
        total: totalStats[0] || { totalOrders: 0, totalAmount: 0, pendingAmount: 0 }
      };
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  };

  // ==================== UTILITY METHODS ====================
  
  generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `SF${timestamp}${random}`;
  };

  getPeriodStartDate = (period) => {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'weekly':
        return new Date(now.setDate(now.getDate() - 7));
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarterly':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  };

  invalidateOrderCaches = async (orderId, orderIdString) => {
    try {
      await Promise.all([
        cacheService.del(`order:${orderId}`),
        cacheService.del(`order:${orderIdString}`),
        cacheService.del('dashboard:all')
      ]);
      logger.info(`Order caches invalidated for: ${orderId}`);
    } catch (error) {
      logger.error('Error invalidating order caches:', error);
    }
  };

  // Invalidate statistics cache
  invalidateStatsCache = async () => {
    try {
      const patterns = [
        'enhanced_order_stats:*',
        'store_sales_stats:*',
        'combined_sales_stats:*',
        'salesman_dashboard_stats:*',
        'dashboard:*'
      ];
      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }
    } catch (error) {
      logger.error('Error invalidating stats cache:', error);
    }
  };

  // Delete an order
  deleteOrderService = async (orderId, userId, userRole) => {
    try {
      const query = { orderId };
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        query.salesman = new mongoose.Types.ObjectId(userId);
      }

      const order = await Order.findOneAndDelete(query);
      if (!order) {
        throw new Error('Order not found or unauthorized');
      }

      await this.invalidateOrderCaches(order._id, orderId);
      await this.invalidateStatsCache();
      return order;
    } catch (error) {
      logger.error(`Error deleting order ${orderId}:`, error);
      throw error;
    }
  };

  // Get sales dashboard data
  getDashboardData = async (salesmanId = null) => {
    try {
      const cacheKey = salesmanId ? `dashboard:${salesmanId}` : 'dashboard:all';
      const cachedDashboard = await cacheService.get(cacheKey);
      if (cachedDashboard) return cachedDashboard;

      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const matchQuery = {};
      if (salesmanId) {
        matchQuery.salesman = new mongoose.Types.ObjectId(salesmanId);
      }

      const [todayStats, monthStats, totalStats] = await Promise.all([
        Order.aggregate([
          { $match: { ...matchQuery, createdAt: { $gte: startOfDay } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              amount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: { ...matchQuery, createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              amount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              amount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ])
      ]);

      const dashboard = {
        today: todayStats[0] || { orders: 0, amount: 0 },
        thisMonth: monthStats[0] || { orders: 0, amount: 0 },
        total: totalStats[0] || { orders: 0, amount: 0 }
      };

      await cacheService.set(cacheKey, dashboard, 300);
      return dashboard;
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  };

  // Get enhanced order statistics
  getEnhancedOrderStats = async (salesmanId = null, dateRange = {}) => {
    try {
      const cacheKey = `enhanced_order_stats:${salesmanId || 'all'}:${JSON.stringify(dateRange)}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : startOfMonth;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : endOfMonth;

      let matchQuery = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      if (salesmanId) {
        matchQuery.salesman = new mongoose.Types.ObjectId(salesmanId);
      }

      const [orderStats, statusBreakdown, revenueStats] = await Promise.all([
        Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$orderDetails.totalAmount' },
              totalCollected: {
                $sum: {
                  $cond: [
                    { $eq: ['$payment.status', 'completed'] },
                    '$payment.amount',
                    0
                  ]
                }
              },
              totalPending: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['draft', 'confirmed', 'processing']] },
                    '$orderDetails.totalAmount',
                    0
                  ]
                }
              },
              averageOrderValue: { $avg: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$orderDetails.totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          { $match: { ...matchQuery, status: 'delivered' } },
          {
            $group: {
              _id: null,
              completedRevenue: { $sum: '$orderDetails.totalAmount' },
              completedOrders: { $sum: 1 }
            }
          }
        ])
      ]);

      const baseStats = orderStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalCollected: 0,
        totalPending: 0,
        averageOrderValue: 0
      };

      const revenueData = revenueStats[0] || { completedRevenue: 0, completedOrders: 0 };

      const stats = {
        orders: {
          total: baseStats.totalOrders,
          completed: revenueData.completedOrders,
          pending: Math.max(0, baseStats.totalOrders - revenueData.completedOrders),
          draft: statusBreakdown.find(s => s._id === 'draft')?.count || 0,
          cancelled: statusBreakdown.find(s => s._id === 'cancelled')?.count || 0
        },
        revenue: {
          total: baseStats.totalRevenue,
          pending: baseStats.totalPending,
          collected: baseStats.totalCollected,
          outstanding: Math.max(0, baseStats.totalRevenue - baseStats.totalCollected)
        },
        performance: {
          averageOrderValue: baseStats.averageOrderValue || 0,
          conversionRate: baseStats.totalOrders > 0 ? (revenueData.completedOrders / baseStats.totalOrders) * 100 : 0,
          collectionRate: baseStats.totalRevenue > 0 ? (baseStats.totalCollected / baseStats.totalRevenue) * 100 : 0
        },
        statusBreakdown
      };

      await cacheService.set(cacheKey, stats, 900);
      return stats;
    } catch (error) {
      logger.error('Error fetching enhanced order stats:', error);
      throw error;
    }
  };

  // Get store sales statistics
  getStoreSalesStats = async (salesmanId = null, dateRange = {}) => {
    try {
      const cacheKey = `store_sales_stats:${salesmanId || 'all'}:${JSON.stringify(dateRange)}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : startOfMonth;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : endOfMonth;

      const filters = { startDate, endDate };
      if (salesmanId) filters.salesmanId = salesmanId;

      const [baseStats, paymentMethodStats, dailyStats] = await Promise.all([
        StoreInvoice.getStats(filters),
        StoreInvoice.getPaymentMethodStats(filters),
        StoreInvoice.getDailyStats(filters)
      ]);

      const stats = {
        storeSales: {
          total: baseStats.totalInvoices,
          completed: baseStats.totalInvoices,
          pending: 0
        },
        revenue: {
          total: baseStats.totalRevenue,
          collected: baseStats.totalCollected,
          pending: baseStats.totalPending
        },
        paymentMethods: (paymentMethodStats || []).reduce((acc, method) => {
          if (method._id) {
            acc[method._id.toLowerCase()] = {
              count: method.count,
              amount: method.totalAmount
            };
          }
          return acc;
        }, {}),
        daily: dailyStats,
        performance: {
          averageOrderValue: baseStats.averageOrderValue || 0,
          collectionRate: baseStats.totalRevenue > 0 ? (baseStats.totalCollected / baseStats.totalRevenue) * 100 : 0
        }
      };

      await cacheService.set(cacheKey, stats, 900);
      return stats;
    } catch (error) {
      logger.error('Error fetching store sales stats:', error);
      throw error;
    }
  };

  // Get combined sales statistics
  getCombinedSalesStats = async (salesmanId = null, dateRange = {}) => {
    try {
      const cacheKey = `combined_sales_stats:${salesmanId || 'all'}:${JSON.stringify(dateRange)}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const [orderStats, storeStats] = await Promise.all([
        this.getEnhancedOrderStats(salesmanId, dateRange),
        this.getStoreSalesStats(salesmanId, dateRange)
      ]);

      const totalRevenue = orderStats.revenue.total + storeStats.revenue.total;
      const totalCollected = orderStats.revenue.collected + storeStats.revenue.collected;

      const combinedStats = {
        combined: {
          totalSales: orderStats.orders.total + storeStats.storeSales.total,
          totalRevenue,
          totalCollected,
          totalOutstanding: Math.max(0, totalRevenue - totalCollected)
        },
        breakdown: {
          orders: {
            count: orderStats.orders.total,
            revenue: orderStats.revenue.total,
            percentage: totalRevenue > 0 ? (orderStats.revenue.total / totalRevenue) * 100 : 0
          },
          store: {
            count: storeStats.storeSales.total,
            revenue: storeStats.revenue.total,
            percentage: totalRevenue > 0 ? (storeStats.revenue.total / totalRevenue) * 100 : 0
          }
        },
        trends: {
          ordersGrowth: 0,
          storeGrowth: 0,
          combinedGrowth: 0
        },
        performance: {
          overallConversionRate: orderStats.performance.conversionRate,
          overallCollectionRate: totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0,
          averageOrderValue: orderStats.performance.averageOrderValue,
          averageStoreValue: storeStats.performance.averageOrderValue
        }
      };

      await cacheService.set(cacheKey, combinedStats, 900);
      return combinedStats;
    } catch (error) {
      logger.error('Error fetching combined sales stats:', error);
      throw error;
    }
  };

  // Get comprehensive dashboard statistics for salesman
  getSalesmanDashboardStatsService = async (salesmanId, dateRange = {}) => {
    try {
      const cacheKey = `salesman_dashboard_stats:${salesmanId}:${JSON.stringify(dateRange)}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) return cachedStats;

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : startOfMonth;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : endOfMonth;

      const matchQuery = {
        createdAt: { $gte: startDate, $lte: endDate }
      };
      if (salesmanId) {
        matchQuery.salesman = new mongoose.Types.ObjectId(salesmanId);
      }

      const [orderStats, storeStats] = await Promise.all([
        Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$orderDetails.totalAmount' },
              totalPending: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['draft', 'confirmed', 'processing']] },
                    1,
                    0
                  ]
                }
              },
              completedOrders: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              }
            }
          }
        ]),
        StoreInvoice.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalStoreInvoices: { $sum: 1 },
              totalStoreRevenue: { $sum: '$totals.total' }
            }
          }
        ])
      ]);

      const orderData = orderStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalPending: 0,
        completedOrders: 0
      };

      const storeData = storeStats[0] || {
        totalStoreInvoices: 0,
        totalStoreRevenue: 0
      };

      const stats = {
        orders: {
          total: orderData.totalOrders,
          pending: orderData.totalPending,
          completed: orderData.completedOrders,
          revenue: orderData.totalRevenue
        },
        storeInvoices: {
          total: storeData.totalStoreInvoices,
          revenue: storeData.totalStoreRevenue
        },
        combined: {
          totalSales: orderData.totalOrders + storeData.totalStoreInvoices,
          totalRevenue: orderData.totalRevenue + storeData.totalStoreRevenue
        },
        dateRange: {
          start: startDate,
          end: endDate
        }
      };

      await cacheService.set(cacheKey, stats, 900);
      return stats;
    } catch (error) {
      logger.error('Error fetching salesman dashboard stats:', error);
      throw error;
    }
  };

  // Create store invoice record
  createStoreInvoiceService = async (invoiceData, salesmanId) => {
    try {
      logger.info('Creating store invoice with data:', { invoiceData, salesmanId });

      const storeInvoice = new StoreInvoice({
        ...invoiceData,
        salesman: salesmanId,
        payment: {
          ...invoiceData.payment,
          collectedBy: salesmanId
        }
      });

      const savedInvoice = await storeInvoice.save();

      try {
        await cacheService.set(`store_invoice:${savedInvoice._id}`, savedInvoice, 3600);
        await cacheService.set(`store_invoice:${savedInvoice.receiptNumber}`, savedInvoice, 3600);
        await this.invalidateStatsCache();
      } catch (cacheError) {
        logger.warn('Cache operation failed:', cacheError.message);
      }

      logger.info(`Store invoice created: ${savedInvoice.receiptNumber} by salesman: ${salesmanId}`);
      return savedInvoice;
    } catch (error) {
      logger.error('Error creating store invoice:', error);
      throw error;
    }
  };

  // Get all store invoices
  getStoreInvoicesService = async (salesmanId = null, filters = {}) => {
    try {
      const query = {};
      if (salesmanId) {
        query.salesman = new mongoose.Types.ObjectId(salesmanId);
      }

      if (filters.status) query.status = filters.status;
      if (filters.paymentStatus) query['payment.status'] = filters.paymentStatus;
      if (filters.dateFrom && filters.dateTo) {
        query.createdAt = { $gte: new Date(filters.dateFrom), $lte: new Date(filters.dateTo) };
      }
      if (filters.customerName) {
        query['customer.name'] = { $regex: filters.customerName, $options: 'i' };
      }

      const storeInvoices = await StoreInvoice.find(query)
        .populate('salesman', 'firstName lastName email')
        .populate('payment.collectedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

      logger.info(`Retrieved ${storeInvoices.length} store invoices`);
      return storeInvoices;
    } catch (error) {
      logger.error('Error fetching store invoices:', error);
      throw error;
    }
  };

  // Get single store invoice by receipt number
  getStoreInvoiceService = async (receiptNumber) => {
    try {
      const storeInvoice = await StoreInvoice.findOne({ receiptNumber })
        .populate('salesman', 'firstName lastName email')
        .populate('payment.collectedBy', 'firstName lastName')
        .lean();

      if (!storeInvoice) {
        throw new Error('Store invoice not found');
      }

      return storeInvoice;
    } catch (error) {
      logger.error(`Error fetching store invoice ${receiptNumber}:`, error);
      throw error;
    }
  };

  // Update store invoice details
  updateStoreInvoiceService = async (receiptNumber, updateData, updatedBy) => {
    try {
      const storeInvoice = await StoreInvoice.findOneAndUpdate(
        { receiptNumber },
        {
          ...updateData,
          lastModifiedBy: updatedBy,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).populate('salesman', 'firstName lastName email');

      if (!storeInvoice) {
        throw new Error('Store invoice not found');
      }

      try {
        await cacheService.set(`store_invoice:${storeInvoice._id}`, storeInvoice, 3600);
        await cacheService.set(`store_invoice:${receiptNumber}`, storeInvoice, 3600);
        await this.invalidateStatsCache();
      } catch (cacheError) {
        logger.warn('Cache update failed:', cacheError.message);
      }

      return storeInvoice;
    } catch (error) {
      logger.error('Error updating store invoice:', error);
      throw error;
    }
  };

  // Delete store invoice
  deleteStoreInvoiceService = async (receiptNumber, deletedBy) => {
    try {
      const storeInvoice = await StoreInvoice.findOneAndDelete({ receiptNumber });
      if (!storeInvoice) {
        throw new Error('Store invoice not found');
      }

      try {
        await cacheService.del(`store_invoice:${storeInvoice._id}`);
        await cacheService.del(`store_invoice:${receiptNumber}`);
        await this.invalidateStatsCache();
      } catch (cacheError) {
        logger.warn('Cache delete failed:', cacheError.message);
      }

      return storeInvoice;
    } catch (error) {
      logger.error(`Error deleting store invoice ${receiptNumber}:`, error);
      throw error;
    }
  };

  // Update store invoice payment status
  updateStoreInvoicePaymentService = async (receiptNumber, paymentData, updatedBy) => {
    try {
      const storeInvoice = await StoreInvoice.findOneAndUpdate(
        { receiptNumber },
        {
          'payment.status': paymentData.status,
          'payment.amount': paymentData.amount,
          'payment.method': paymentData.method,
          'payment.collectedAt': new Date(),
          'payment.collectedBy': updatedBy,
          lastModifiedBy: updatedBy
        },
        { new: true, runValidators: true }
      );

      if (!storeInvoice) {
        throw new Error('Store invoice not found');
      }

      try {
        await cacheService.set(`store_invoice:${storeInvoice._id}`, storeInvoice, 3600);
        await cacheService.set(`store_invoice:${receiptNumber}`, storeInvoice, 3600);
        await this.invalidateStatsCache();
      } catch (cacheError) {
        logger.warn('Cache operation failed:', cacheError.message);
      }

      return storeInvoice;
    } catch (error) {
      logger.error('Error updating store invoice payment:', error);
      throw error;
    }
  };

  // Auth helper: find salesman by email with password
  findSalesmanByEmailForAuth = async (email) => {
    return Salesman.findOne({ email: email.toLowerCase().trim() }).select('+password');
  };

  // Get notifications for an order via notificationsService
  getOrderNotificationsService = async (orderId) => {
    try {
      const result = await notificationsService.getNotificationsService({ orderId });
      return result.notifications || [];
    } catch (error) {
      logger.error(`Error fetching order notifications for ${orderId}:`, error);
      return [];
    }
  };

  // Generate Store Invoice PDF
  generateStoreInvoicePDFService = async (receiptNumber, directData = null) => {
    try {
      let storeInvoice = directData;
      if (!storeInvoice) {
        storeInvoice = await StoreInvoice.findOne({ receiptNumber })
          .populate('salesman', 'firstName lastName');
      }

      if (!storeInvoice) {
        throw new Error('Store invoice not found');
      }

      const pdfData = {
        receiptNumber: storeInvoice.receiptNumber,
        customerName: storeInvoice.customer?.name || 'Walk-in Customer',
        customerPhone: storeInvoice.customer?.phone || '',
        customerEmail: storeInvoice.customer?.email || '',
        salesmanName: storeInvoice.salesman ? `${storeInvoice.salesman.firstName || ''} ${storeInvoice.salesman.lastName || ''}`.trim() : 'Store Staff',
        items: storeInvoice.items || [],
        totalAmount: storeInvoice.totals?.total || storeInvoice.totalAmount || 0,
        subtotal: storeInvoice.totals?.subtotal || 0,
        gst: storeInvoice.totals?.gst || 0,
        gstAmount: storeInvoice.totals?.gstAmount || 0,
        paymentMethod: storeInvoice.payment?.method || 'Cash',
        paymentStatus: storeInvoice.payment?.status || 'completed',
        amountPaid: storeInvoice.payment?.amount || storeInvoice.totals?.total || 0,
        deviceType: storeInvoice.deviceType || 'large'
      };

      const pdfBuffer = await generateStoreInvoicePDF(pdfData);

      return {
        buffer: pdfBuffer,
        fileSize: pdfBuffer.length,
        fileName: `StoreInvoice_${receiptNumber}.pdf`
      };
    } catch (error) {
      logger.error('Error in generateStoreInvoicePDF service:', error);
      throw error;
    }
  };

  // Generate Order PDF
  generateOrderPDFService = async (orderId) => {
    try {
      const order = await this.getOrderByIdService(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const pdfBuffer = await generateOrderPDF(order);

      return {
        buffer: pdfBuffer,
        fileSize: pdfBuffer.length,
        fileName: `Order_${order.orderId}.pdf`
      };
    } catch (error) {
      logger.error('Error in generateOrderPDF service:', error);
      throw error;
    }
  };

  // Generate Warranty PDF
  generateWarrantyPDFService = async (warrantyData, orderId = null) => {
    try {
      let mergedData = { ...warrantyData };

      // If an orderId is provided, try to prefill customer and order details from the order
      if (orderId) {
        try {
          const order = await this.getOrderByIdService(orderId);
          if (order) {
            mergedData = {
              orderNumber: order.orderId,
              customerName: order.customer?.name || mergedData.customerName,
              mobileNumber: order.customer?.phone || mergedData.mobileNumber,
              email: order.customer?.email || mergedData.email,
              address: [order.customer?.address?.street, order.customer?.address?.city].filter(Boolean).join(', ') || mergedData.address,
              city: order.customer?.address?.city || mergedData.city,
              state: order.customer?.address?.state || mergedData.state,
              invoiceDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : mergedData.invoiceDate,
              totalQuantity: order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || mergedData.totalQuantity || 1,
              ...mergedData
            };
          }
        } catch (e) {
          logger.warn(`Could not link order ${orderId} to warranty:`, e.message);
        }
      }

      const certNumber = mergedData.orderNumber || orderId || `SF-${Date.now()}`;
      const pdfBuffer = await generateWarrantyPDF(certNumber, mergedData);

      return {
        buffer: pdfBuffer,
        fileSize: pdfBuffer.length,
        fileName: `Warranty_${certNumber}.pdf`
      };
    } catch (error) {
      logger.error('Error in generateWarrantyPDF service:', error);
      throw error;
    }
  };
}

export default new SalesService();
