import mongoose from 'mongoose';
import Accountant from '../models/Accountant.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import FinancialReport from '../models/FinancialReport.js';
import { cacheService } from '../../../config/db.js';
import logger from '../../../utils/logger.js';
import { runInTransaction } from '../../../utils/transaction.js';

class AccountsService {
  constructor() {
    this.cachePrefix = 'accounts:';
    this.defaultCacheTTL = 3600; // 1 hour
  }

  // ==================== PAYMENT SERVICES ====================

  // Create payment record (supports optional transaction session)
  createPaymentService = async (paymentData, session = null) => {
    try {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      const transactionId = paymentData.transactionId || `TXN${timestamp}${random}`;
      const receiptNumber = paymentData.receiptNumber || `RCP${timestamp}`;

      const paymentPayload = {
        ...paymentData,
        transactionId,
        status: paymentData.status || 'pending',
        receipt: {
          receiptNumber,
          receiptDate: new Date(),
          ...(paymentData.receipt || {})
        }
      };

      let savedPayment;
      if (session) {
        const created = await Payment.create([paymentPayload], { session });
        savedPayment = created[0];
      } else {
        savedPayment = await Payment.create(paymentPayload);
      }

      // If called outside an external transaction, invalidate cache immediately
      if (!session) {
        await this.invalidatePaymentCaches(savedPayment._id, savedPayment.orderId);
      }

      logger.info(`Payment record created: ${savedPayment._id} for order ${savedPayment.orderId}`);
      return savedPayment;
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  };

  // Verify payment with MongoDB session and ACID transaction
  verifyPaymentService = async (paymentId, verificationData, verifiedBy) => {
    try {
      let updatedPayment = null;

      await runInTransaction(async (session) => {
        const query = Payment.findById(paymentId);
        if (session) query.session(session);
        const payment = await query;
        if (!payment) {
          throw new Error('Payment not found');
        }

        // Update verification details
        payment.verification = {
          isVerified: true,
          verifiedBy,
          verifiedAt: new Date(),
          verificationNotes: verificationData.notes || '',
          verificationMethod: verificationData.method || 'manual'
        };

        // Update payment status if verified
        if (payment.status === 'pending') {
          payment.status = 'completed';
        }

        updatedPayment = await payment.save(session ? { session } : {});

        // Lazy load salesService to prevent circular dependency
        const salesService = (await import('../../sales/services/salesService.js')).default;

        // Synchronize with Sales module within the same transaction
        const orderRef = payment.order || payment.orderId;
        if (orderRef) {
          await salesService.addPaymentService(
            orderRef,
            {
              amount: payment.amount,
              method: payment.method,
              transactionId: payment.transactionId,
              utrNumber: payment.paymentDetails?.utrNumber,
              notes: `Payment verified by accountant ${verifiedBy}`
            },
            verifiedBy,
            'Accountant',
            session
          );
        }
      });

      // Cache invalidation and logging occurs AFTER successful transaction commit
      if (updatedPayment) {
        await this.invalidatePaymentCaches(paymentId, updatedPayment.orderId);
        logger.info(`Payment verified: ${paymentId} by ${verifiedBy}`);
      }

      return updatedPayment;
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  };

  // Get payments with filtering and caching
  getPaymentsService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const cacheKey = `${this.cachePrefix}payments:${JSON.stringify(filters)}:${page}:${limit}`;
      
      // Try cache first
      const cachedPayments = await cacheService.get(cacheKey);
      if (cachedPayments) {
        return cachedPayments;
      }

      const query = {};
      
      // Build dynamic query
      if (filters.orderId) query.orderId = filters.orderId;
      if (filters.status) query.status = filters.status;
      if (filters.method) query.method = filters.method;
      if (filters.isVerified !== undefined) query['verification.isVerified'] = filters.isVerified;
      if (filters.collectedBy) query.collectedBy = filters.collectedBy;
      if (filters.transactionId) query.transactionId = { $regex: filters.transactionId, $options: 'i' };
      if (filters.minAmount) query.amount = { ...query.amount, $gte: parseFloat(filters.minAmount) };
      if (filters.maxAmount) query.amount = { ...query.amount, $lte: parseFloat(filters.maxAmount) };
      if (filters.dateFrom || filters.dateTo) {
        query.collectedAt = {};
        if (filters.dateFrom) query.collectedAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.collectedAt.$lte = new Date(filters.dateTo);
      }

      const skip = (page - 1) * limit;
      
      const [payments, total] = await Promise.all([
        Payment.find(query)
          .sort({ collectedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('order', 'orderId customer')
          .populate('collectedBy', 'firstName lastName')
          .populate('verification.verifiedBy', 'firstName lastName'),
        Payment.countDocuments(query)
      ]);

      const result = {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, result, 600);
      
      return result;
    } catch (error) {
      logger.error('Error fetching payments:', error);
      throw error;
    }
  };

  // Update payment
  updatePaymentService = async (paymentId, updateData, updatedBy) => {
    try {
      const payment = await Payment.findByIdAndUpdate(
        paymentId,
        {
          ...updateData,
          lastModifiedBy: updatedBy,
          lastModifiedByModel: this.getUserModel(updatedBy)
        },
        { new: true, runValidators: true }
      );

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Invalidate related caches
      await this.invalidatePaymentCaches(paymentId, payment.orderId);

      logger.info(`Payment updated: ${paymentId} by ${updatedBy}`);
      return payment;
    } catch (error) {
      logger.error('Error updating payment:', error);
      throw error;
    }
  };

  // Get payment by ID
  getPaymentByIdService = async (paymentId) => {
    try {
      const cacheKey = `${this.cachePrefix}payment:${paymentId}`;
      
      // Try cache first
      const cachedPayment = await cacheService.get(cacheKey);
      if (cachedPayment) {
        return cachedPayment;
      }

      const payment = await Payment.findById(paymentId)
        .populate('order', 'orderId customer orderDetails')
        .populate('collectedBy', 'firstName lastName')
        .populate('verification.verifiedBy', 'firstName lastName');

      if (payment) {
        await cacheService.set(cacheKey, payment, this.defaultCacheTTL);
      }

      return payment;
    } catch (error) {
      logger.error(`Error fetching payment ${paymentId}:`, error);
      throw error;
    }
  };

  // Get user model based on role
  getUserModel = (userId) => {
    return 'Accountant';
  };

  // ==================== INVOICE SERVICES ====================

  // Create invoice with service-layer calculations (GST, totals, invoiceNumber) and transaction support
  createInvoiceService = async (invoiceData, createdBy, session = null) => {
    try {
      // 1. Generate invoice number if not provided
      let invoiceNumber = invoiceData.invoiceNumber;
      if (!invoiceNumber) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        invoiceNumber = `INV${timestamp}${random}`;
      }

      // 2. Perform item-level GST calculations
      let subtotal = 0;
      let totalDiscount = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const items = (invoiceData.items || []).map(item => {
        const quantity = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        const itemTotal = quantity * rate;

        const discount = Number(item.discount) || 0;
        const discountAmount = item.discountType === 'amount'
          ? discount
          : (itemTotal * discount) / 100;

        const taxableAmount = Math.max(0, itemTotal - discountAmount);
        const cgstRate = Number(item.cgstRate) || 0;
        const sgstRate = Number(item.sgstRate) || 0;
        const igstRate = Number(item.igstRate) || 0;

        const cgstAmount = (taxableAmount * cgstRate) / 100;
        const sgstAmount = (taxableAmount * sgstRate) / 100;
        const igstAmount = (taxableAmount * igstRate) / 100;
        const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

        subtotal += itemTotal;
        totalDiscount += discountAmount;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalIgst += igstAmount;

        return {
          ...item,
          quantity,
          rate,
          discount,
          discountType: item.discountType || 'percentage',
          taxableAmount,
          cgstRate,
          sgstRate,
          igstRate,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalAmount
        };
      });

      // 3. Compute invoice-level aggregates
      const taxableAmount = subtotal - totalDiscount;
      const totalTax = totalCgst + totalSgst + totalIgst;
      const beforeRoundOff = taxableAmount + totalTax;
      const grandTotal = Math.round(beforeRoundOff);
      const roundOff = Math.round((grandTotal - beforeRoundOff) * 100) / 100;
      const advancePaid = Number(invoiceData.financialDetails?.advancePaid) || 0;
      const balanceAmount = grandTotal - advancePaid;

      const financialDetails = {
        subtotal,
        totalDiscount,
        taxableAmount,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax,
        roundOff,
        grandTotal,
        advancePaid,
        balanceAmount,
        ...(invoiceData.financialDetails || {})
      };

      financialDetails.subtotal = invoiceData.financialDetails?.subtotal ?? subtotal;
      financialDetails.taxableAmount = invoiceData.financialDetails?.taxableAmount ?? taxableAmount;
      financialDetails.totalCgst = invoiceData.financialDetails?.totalCgst ?? totalCgst;
      financialDetails.totalSgst = invoiceData.financialDetails?.totalSgst ?? totalSgst;
      financialDetails.totalIgst = invoiceData.financialDetails?.totalIgst ?? totalIgst;
      financialDetails.totalTax = invoiceData.financialDetails?.totalTax ?? totalTax;
      financialDetails.grandTotal = invoiceData.financialDetails?.grandTotal ?? grandTotal;
      financialDetails.roundOff = invoiceData.financialDetails?.roundOff ?? roundOff;
      financialDetails.balanceAmount = invoiceData.financialDetails?.balanceAmount ?? balanceAmount;

      const invoicePayload = {
        ...invoiceData,
        invoiceNumber,
        items,
        financialDetails,
        createdBy,
        createdByModel: this.getUserModel(createdBy)
      };

      // 4. Persist using Invoice.create() with transaction support
      let savedInvoice;
      if (session) {
        const created = await Invoice.create([invoicePayload], { session });
        savedInvoice = created[0];
      } else {
        savedInvoice = await Invoice.create(invoicePayload);
      }

      // Cache the invoice
      await cacheService.set(`${this.cachePrefix}invoice:${savedInvoice._id}`, savedInvoice, this.defaultCacheTTL);

      logger.info(`Invoice created: ${savedInvoice.invoiceNumber} by ${createdBy}`);
      return savedInvoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  };

  createInvoice = this.createInvoiceService;

  // Get invoices with filtering
  getInvoicesService = async (filters = {}, page = 1, limit = 10) => {
    try {
      const query = {};
      
      // Build dynamic query
      if (filters.status) query.status = filters.status;
      if (filters.invoiceType) query.invoiceType = filters.invoiceType;
      if (filters.orderId) query.orderId = filters.orderId;
      if (filters.customerName) query['customer.name'] = { $regex: filters.customerName, $options: 'i' };
      if (filters.isOverdue) {
        query['paymentTerms.dueDate'] = { $lt: new Date() };
        query.status = { $nin: ['paid', 'cancelled'] };
      }
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const skip = (page - 1) * limit;
      
      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('order', 'orderId customer')
          .populate('createdBy', 'firstName lastName'),
        Invoice.countDocuments(query)
      ]);

      return {
        invoices,
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
      logger.error('Error fetching invoices:', error);
      throw error;
    }
  };

  // ==================== FINANCIAL REPORTING SERVICES ====================

  // Generate financial report
  generateFinancialReportService = async (reportData, createdBy) => {
    try {
      const report = new FinancialReport({
        ...reportData,
        status: 'generating',
        createdBy,
        createdByModel: this.getUserModel(createdBy)
      });

      const savedReport = await report.save();

      // Generate report data asynchronously
      setImmediate(async () => {
        try {
          await this.populateReportData(savedReport);
          savedReport.status = 'completed';
          await savedReport.save();
          logger.info(`Financial report generated: ${savedReport.reportId}`);
        } catch (error) {
          savedReport.status = 'failed';
          await savedReport.save();
          logger.error(`Financial report generation failed: ${savedReport.reportId}`, error);
        }
      });

      return savedReport;
    } catch (error) {
      logger.error('Error creating financial report:', error);
      throw error;
    }
  };

  // Populate report data
  populateReportData = async (report) => {
    const { startDate, endDate } = report.dateRange;
    
    // Get sales data
    const salesData = await this.getSalesDataForReport(startDate, endDate);
    report.data.salesData = salesData;

    // Get payment data
    const paymentData = await this.getPaymentDataForReport(startDate, endDate);
    report.data.paymentData = paymentData;

    // Calculate summary
    report.data.summary = {
      totalRevenue: salesData.totalSales,
      totalExpenses: 0, // Would integrate with expense system
      netProfit: salesData.totalSales,
      grossMargin: 100,
      netMargin: 100
    };

    return report.save();
  };

  // Get sales data for report
  getSalesDataForReport = async (startDate, endDate) => {
    try {
      const salesAgg = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$orderDetails.totalAmount' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$orderDetails.totalAmount' }
          }
        }
      ]);

      return salesAgg[0] || {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0
      };
    } catch (error) {
      logger.error('Error getting sales data for report:', error);
      return { totalSales: 0, totalOrders: 0, averageOrderValue: 0 };
    }
  };

  // Get payment data for report
  getPaymentDataForReport = async (startDate, endDate) => {
    try {
      const paymentAgg = await Payment.aggregate([
        {
          $match: {
            collectedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
            totalPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } }
          }
        }
      ]);

      return paymentAgg[0] || { totalCollected: 0, totalPending: 0 };
    } catch (error) {
      logger.error('Error getting payment data for report:', error);
      return { totalCollected: 0, totalPending: 0 };
    }
  };

  // ==================== DASHBOARD SERVICES ====================

  // Get accounts dashboard data
  getAccountsDashboard = async (userId = null, role = null) => {
    try {
      const [paymentStats, invoiceStats, recentPayments] = await Promise.all([
        Payment.getStats(),
        Invoice.getStats(),
        this.getPaymentsService({}, 1, 5)
      ]);

      return {
        paymentStats,
        invoiceStats,
        recentActivity: {
          payments: recentPayments.payments
        }
      };
    } catch (error) {
      logger.error('Error fetching accounts dashboard:', error);
      throw error;
    }
  };

  // Auth helper: find accountant by email with password
  findAccountantByEmailForAuth = async (email) => {
    return Accountant.findOne({ email: email.toLowerCase().trim() }).select('+password');
  };

  // Invalidate payment-related caches
  invalidatePaymentCaches = async (paymentId, orderId) => {
    try {
      const cacheKeys = [
        `${this.cachePrefix}payment:${paymentId}`,
        `${this.cachePrefix}payments:*`,
        `${this.cachePrefix}payment_stats:*`,
        `${this.cachePrefix}dashboard:*`
      ];
      
      await Promise.all(
        cacheKeys.map(key => cacheService.del(key))
      );
      
      logger.info(`Payment caches invalidated for: ${paymentId}`);
    } catch (error) {
      logger.error('Error invalidating payment caches:', error);
    }
  };
}

export default new AccountsService();
