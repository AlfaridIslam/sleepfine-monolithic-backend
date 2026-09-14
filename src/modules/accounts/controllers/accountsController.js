import accountsService from '../services/accountsService.js';
import Invoice from '../models/Invoice.js';
import FinancialReport from '../models/FinancialReport.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/apiResponse.js';
import logger from '../../../utils/logger.js';

// ==================== PAYMENT MANAGEMENT ====================

// Verify payment
export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const verificationData = req.body;
  const verifiedBy = req.user._id;

  const payment = await accountsService.verifyPaymentService(
    paymentId,
    verificationData,
    verifiedBy
  );

  logger.info(`Payment verified: ${paymentId} by user: ${verifiedBy}`);

  res.status(200).json(
    new ApiResponse(200, payment, 'Payment verified successfully')
  );
});

// Get payments with filtering
export const getPayments = asyncHandler(async (req, res) => {
  const {
    orderId,
    status,
    method,
    isVerified,
    collectedBy,
    transactionId,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10
  } = req.query;

  const filters = {
    orderId: req.params.orderId || orderId,
    status,
    method,
    isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
    collectedBy,
    transactionId,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await accountsService.getPaymentsService(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Payments retrieved successfully')
  );
});

// Get payment by ID
export const getPaymentById = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await accountsService.getPaymentByIdService(paymentId);

  if (!payment) {
    return res.status(404).json(
      new ApiResponse(404, null, 'Payment not found')
    );
  }

  res.status(200).json(
    new ApiResponse(200, payment, 'Payment retrieved successfully')
  );
});

// Update payment
export const updatePayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const updateData = req.body;
  const updatedBy = req.user._id;

  const payment = await accountsService.updatePaymentService(
    paymentId,
    updateData,
    updatedBy
  );

  logger.info(`Payment updated: ${paymentId} by user: ${updatedBy}`);

  res.status(200).json(
    new ApiResponse(200, payment, 'Payment updated successfully')
  );
});

// ==================== INVOICE MANAGEMENT ====================

// Create invoice
export const createInvoice = asyncHandler(async (req, res) => {
  const invoiceData = req.body;
  const createdBy = req.user?._id || req.user?.id || req.user?.userId;

  const invoice = await accountsService.createInvoiceService(invoiceData, createdBy);

  logger.info(`Invoice created: ${invoice.invoiceNumber} by user: ${createdBy}`);

  res.status(201).json(
    new ApiResponse(201, invoice, 'Invoice created successfully')
  );
});

// Get invoices with filtering
export const getInvoices = asyncHandler(async (req, res) => {
  const {
    status,
    invoiceType,
    orderId,
    customerName,
    customerEmail,
    isOverdue,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10
  } = req.query;

  const filters = {
    status,
    invoiceType,
    orderId,
    customerName,
    customerEmail,
    isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined,
    dateFrom,
    dateTo
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) delete filters[key];
  });

  const result = await accountsService.getInvoicesService(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Invoices retrieved successfully')
  );
});

// ==================== DASHBOARD & ANALYTICS ====================

// Get accounts dashboard data
export const getAccountsDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { role } = req.query;

  // Admin can view dashboard for any role, others can only view their own
  const targetRole = (userRole === 'admin' && role) ? role : userRole;
  const targetUserId = (userRole === 'admin' && !role) ? null : userId;

  const dashboard = await accountsService.getAccountsDashboard(targetUserId, targetRole);

  res.status(200).json(
    new ApiResponse(200, dashboard, 'Accounts dashboard data retrieved successfully')
  );
});

// Generate financial report
export const generateFinancialReport = asyncHandler(async (req, res) => {
  const reportData = req.body;
  const createdBy = req.user._id;

  const report = await accountsService.generateFinancialReportService(reportData, createdBy);

  logger.info(`Financial report initiated: ${report.reportId} by user: ${createdBy}`);

  res.status(201).json(
    new ApiResponse(201, report, 'Financial report generation started')
  );
});

// Health check for accounts service
export const healthCheck = asyncHandler(async (req, res) => {
  const health = {
    service: 'accounts',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      paymentVerification: true,
      invoiceGeneration: true,
      financialReporting: true,
      dashboard: true
    },
    database: {
      status: 'connected',
      name: 'MongoDB'
    }
  };

  res.status(200).json(
    new ApiResponse(200, health, 'Accounts service is healthy')
  );
});
