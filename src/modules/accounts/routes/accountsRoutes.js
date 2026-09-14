import express from 'express';
import { authenticate, authorize, requirePermission } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';
import {
  verifyPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  createInvoice,
  getInvoices,
  getAccountsDashboard,
  generateFinancialReport,
  healthCheck
} from '../controllers/accountsController.js';

const router = express.Router();

// ==================== HEALTH & TEST ROUTES ====================

// Health check endpoint
router.get('/health', healthCheck);

// ==================== PAYMENT MANAGEMENT ROUTES ====================

// Verify payment
router.patch('/payments/:paymentId/verify',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('verify_payments'),
  validateRequest(businessSchemas.verifyPayment),
  verifyPayment
);

// Get payments with filtering
router.get('/payments',
  authenticate,
  authorize(['admin', 'accounts', 'salesman']),
  requirePermission('view_payments'),
  getPayments
);

// Get payment by ID
router.get('/payments/:paymentId',
  authenticate,
  authorize(['admin', 'accounts', 'salesman']),
  requirePermission('view_payments'),
  getPaymentById
);

// Update payment
router.patch('/payments/:paymentId',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('update_payments'),
  validateRequest(businessSchemas.updatePayment),
  updatePayment
);

// Get payments by order ID
router.get('/orders/:orderId/payments',
  authenticate,
  authorize(['admin', 'accounts', 'salesman']),
  requirePermission('view_payments'),
  getPayments
);

// ==================== INVOICE MANAGEMENT ROUTES ====================

// Create invoice
router.post('/invoices',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('create_invoice'),
  validateRequest(businessSchemas.createInvoice),
  createInvoice
);

// Get invoices with filtering
router.get('/invoices',
  authenticate,
  authorize(['admin', 'accounts', 'salesman']),
  requirePermission('view_invoice'),
  getInvoices
);

// Get invoice by ID
router.get('/invoices/:invoiceId',
  authenticate,
  authorize(['admin', 'accounts', 'salesman']),
  requirePermission('view_invoice'),
  getInvoices
);

// Update invoice
router.patch('/invoices/:invoiceId',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('update_invoice'),
  validateRequest(businessSchemas.updateInvoice),
  updatePayment
);

// Mark invoice as paid
router.patch('/invoices/:invoiceId/mark-paid',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('update_invoice'),
  validateRequest(businessSchemas.markInvoicePaid),
  updatePayment
);

// Get overdue invoices
router.get('/invoices/overdue',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_invoice'),
  getInvoices
);

// ==================== FINANCIAL REPORTING ROUTES ====================

// Generate financial report
router.post('/reports/generate',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('create_accounts_reports'),
  validateRequest(businessSchemas.generateFinancialReport),
  generateFinancialReport
);

// Get financial reports
router.get('/reports',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  generateFinancialReport
);

// Get financial report by ID
router.get('/reports/:reportId',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  generateFinancialReport
);

// Download financial report
router.get('/reports/:reportId/download/:format',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  generateFinancialReport
);

// ==================== DASHBOARD & ANALYTICS ROUTES ====================

// Get accounts dashboard data
router.get('/dashboard',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// Get payment statistics
router.get('/stats/payments',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// Get invoice statistics
router.get('/stats/invoices',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// Get accounts summary
router.get('/summary',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// Get receivables aging report
router.get('/reports/receivables-aging',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// Get payment method analysis
router.get('/analysis/payment-methods',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_accounts_reports'),
  getAccountsDashboard
);

// ==================== ACCOUNTANT MANAGEMENT ROUTES ====================

// Get accountants
router.get('/accountants',
  authenticate,
  authorize(['admin']),
  requirePermission('manage_users'),
  getAccountsDashboard
);

// Get accountant by ID
router.get('/accountants/:accountantId',
  authenticate,
  authorize(['admin']),
  requirePermission('manage_users'),
  getAccountsDashboard
);

// Update accountant
router.patch('/accountants/:accountantId',
  authenticate,
  authorize(['admin']),
  requirePermission('manage_users'),
  validateRequest(businessSchemas.updateAccountant),
  getAccountsDashboard
);

// ==================== VERIFICATION & AUDIT ROUTES ====================

// Get unverified payments
router.get('/payments/unverified',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_payments'),
  getPayments
);

// Bulk verify payments
router.patch('/payments/bulk-verify',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('verify_payments'),
  validateRequest(businessSchemas.bulkVerifyPayments),
  verifyPayment
);

// Get audit trail
router.get('/audit-trail',
  authenticate,
  authorize(['admin', 'accounts']),
  requirePermission('view_audit_logs'),
  getAccountsDashboard
);

export default router;
