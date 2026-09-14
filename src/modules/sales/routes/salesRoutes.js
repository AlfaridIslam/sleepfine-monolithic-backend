import express from 'express';
import { authenticate, authorize, requirePermission } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';
import * as salesController from '../controllers/salesController.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sales module is running',
    timestamp: new Date().toISOString(),
    service: 'sales',
    version: '1.0.0'
  });
});

// ==================== ORDER ROUTES ====================

// Create new order
router.post('/orders',
  authenticate,
  authorize(['salesman', 'admin']),
  requirePermission('create_order'),
  validateRequest(businessSchemas.createOrder),
  salesController.createOrder
);

// Get all orders (with filters)
router.get('/orders',
  authenticate,
  authorize(['salesman', 'admin', 'logistics', 'accounts']),
  requirePermission('view_order'),
  validateRequest(businessSchemas.getOrders, 'query'),
  salesController.getOrders
);

// Get order by ID
router.get('/orders/:orderId',
  authenticate,
  authorize(['salesman', 'admin', 'logistics', 'accounts']),
  requirePermission('view_order'),
  salesController.getOrderById
);

// Update order
router.put('/orders/:orderId',
  authenticate,
  authorize(['salesman', 'admin']),
  requirePermission('update_order'),
  validateRequest(businessSchemas.updateOrder),
  salesController.updateOrder
);

// Delete order
router.delete('/orders/:orderId',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.deleteOrder
);

// Update order status
router.patch('/orders/:orderId/status',
  authenticate,
  authorize(['salesman', 'admin', 'logistics']),
  requirePermission('update_order'),
  validateRequest(businessSchemas.updateOrderStatus),
  salesController.updateOrderStatus
);

// Add payment transaction
router.post('/orders/:orderId/payment',
  authenticate,
  authorize(['salesman', 'admin', 'driver', 'accounts']),
  requirePermission('update_payment'),
  validateRequest(businessSchemas.addPayment),
  salesController.addPayment
);

// Send order to WhatsApp group
router.post('/orders/:orderId/whatsapp',
  authenticate,
  authorize(['salesman', 'admin']),
  requirePermission('send_notifications'),
  salesController.sendToWhatsApp
);

// Get order notifications
router.get('/orders/:orderId/notifications',
  authenticate,
  authorize(['salesman', 'admin', 'logistics', 'accounts']),
  requirePermission('view_order'),
  salesController.getOrderNotifications
);

// Get order PDF
router.get('/orders/:orderId/pdf',
  authenticate,
  authorize(['salesman', 'admin', 'logistics', 'accounts']),
  salesController.getOrderPDF
);

// ==================== SALESMAN ROUTES ====================

// Create new salesman
router.post('/salesmen',
  authenticate,
  authorize(['admin']),
  requirePermission('create_user'),
  validateRequest(businessSchemas.createSalesman),
  salesController.createSalesman
);

// Get all salesmen
router.get('/salesmen',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_user'),
  salesController.getSalesmen
);

// Get salesman by ID
router.get('/salesmen/:salesmanId',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_user'),
  salesController.getSalesmanById
);

// Get orders by salesman
router.get('/salesmen/:salesmanId/orders',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_order'),
  salesController.getSalesmanOrders
);

// Get salesman performance
router.get('/salesmen/:salesmanId/performance',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_sales_reports'),
  salesController.getSalesmanPerformance
);

// ==================== REPORT ROUTES ====================

// Get sales reports
router.get('/reports/sales',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_sales_reports'),
  salesController.getSalesReport
);

// Get performance reports
router.get('/reports/performance',
  authenticate,
  authorize(['admin']),
  requirePermission('view_sales_reports'),
  salesController.getPerformanceReport
);

// Get sales dashboard data
router.get('/dashboard',
  authenticate,
  authorize(['admin', 'salesman']),
  requirePermission('view_sales_reports'),
  salesController.getDashboardData
);

// Get comprehensive statistics for salesman dashboard
router.get('/dashboard/stats',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getSalesmanDashboardStats
);

// Get enhanced order statistics
router.get('/dashboard/enhanced-stats',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getEnhancedOrderStats
);

// Get store sales statistics
router.get('/dashboard/store-stats',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getStoreSalesStats
);

// Get combined sales statistics (orders + store)
router.get('/dashboard/combined-stats',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getCombinedSalesStats
);

// ==================== STORE INVOICE ROUTES ====================

// Get all store invoices with filtering
router.get('/store-invoices',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getStoreInvoices
);

// Create store invoice record
router.post('/store-invoices',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.createStoreInvoice
);

// Get single store invoice by receipt number
router.get('/store-invoices/:receiptNumber',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getStoreInvoice
);

// Update store invoice details
router.put('/store-invoices/:receiptNumber',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.updateStoreInvoice
);

// Delete store invoice
router.delete('/store-invoices/:receiptNumber',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.deleteStoreInvoice
);

// Update store invoice payment status
router.patch('/store-invoices/:receiptNumber/payment',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.updateStoreInvoicePayment
);

// Generate PDF for existing store invoice
router.get('/store-invoices/:receiptNumber/pdf',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.generateStoreInvoicePDF
);

// Generate standalone store invoice PDF directly
router.post('/store-invoice',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.generateStandaloneStoreInvoice
);

// ==================== WARRANTY ROUTES ====================

// Generate warranty PDF for order
router.post('/orders/:orderId/warranty',
  authenticate,
  authorize(['salesman', 'admin', 'logistics']),
  salesController.generateWarrantyPDF
);

// Generate standalone warranty PDF (authenticated)
router.post('/warranty',
  authenticate,
  authorize(['salesman', 'admin', 'logistics']),
  salesController.generateWarrantyPDF
);

// Generate public warranty PDF (public self-service registration)
router.post('/public/warranty',
  salesController.generateWarrantyPDF
);

// ==================== PRODUCT ROUTES ====================

router.get('/products',
  authenticate,
  authorize(['salesman', 'admin']),
  salesController.getProducts
);

// ==================== PROFILE ROUTES ====================

router.get('/profile',
  authenticate,
  authorize(['salesman']),
  (req, res, next) => {
    req.params.salesmanId = req.user.id;
    return salesController.getSalesmanById(req, res, next);
  }
);

router.get('/my-orders',
  authenticate,
  authorize(['salesman']),
  (req, res, next) => {
    req.params.salesmanId = req.user.id;
    return salesController.getSalesmanOrders(req, res, next);
  }
);

router.get('/my-performance',
  authenticate,
  authorize(['salesman']),
  (req, res, next) => {
    req.params.salesmanId = req.user.id;
    return salesController.getSalesmanPerformance(req, res, next);
  }
);

export default router;
