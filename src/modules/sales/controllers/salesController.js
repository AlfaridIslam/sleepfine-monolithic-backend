import salesService from '../services/salesService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/response.js';
import logger from '../../../utils/logger.js';

// ==================== ORDER CONTROLLERS ====================

// Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const salesmanId = req.user?.id || req.user?._id;
  const order = await salesService.createOrderService(req.body, salesmanId);
  logger.info(`Order created successfully: ${order.orderId} by salesman: ${salesmanId}`);
  return ApiResponse.created(res, 'Order created successfully', order);
});

// Get all orders (with filters)
export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  
  const result = await salesService.getOrdersService(
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  return ApiResponse.success(res, 200, 'Orders retrieved successfully', result);
});

// Get order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await salesService.getOrderByIdService(req.params.orderId);
  
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  return ApiResponse.success(res, 200, 'Order retrieved successfully', order);
});

// Update order
export const updateOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const userRole = req.user?.role || 'salesman';

  const order = await salesService.updateOrderService(
    req.params.orderId,
    req.body,
    userId,
    userRole
  );

  return ApiResponse.success(res, 200, 'Order updated successfully', order);
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const userId = req.user?.id || req.user?._id;
  const userRole = req.user?.role || 'salesman';
  
  const order = await salesService.updateOrderStatusService(
    req.params.orderId,
    status,
    userId,
    userRole
  );

  return ApiResponse.success(res, 200, 'Order status updated successfully', order);
});

// Add payment transaction
export const addPayment = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const userRole = req.user?.role || 'salesman';

  const order = await salesService.addPaymentService(
    req.params.orderId,
    req.body,
    userId,
    userRole
  );

  return ApiResponse.success(res, 200, 'Payment added successfully', order);
});

// ==================== SALESMAN CONTROLLERS ====================

// Create new salesman
export const createSalesman = asyncHandler(async (req, res) => {
  const salesman = await salesService.createSalesmanService(req.body);
  return ApiResponse.created(res, 'Salesman created successfully', salesman);
});

// Get all salesmen
export const getSalesmen = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  
  const result = await salesService.getSalesmenService(
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  return ApiResponse.success(res, 200, 'Salesmen retrieved successfully', result);
});

// Get salesman by ID
export const getSalesmanById = asyncHandler(async (req, res) => {
  const salesman = await salesService.getSalesmanByIdService(req.params.salesmanId);
  
  if (!salesman) {
    return ApiResponse.notFound(res, 'Salesman not found');
  }

  return ApiResponse.success(res, 200, 'Salesman retrieved successfully', salesman);
});

// Get orders by salesman
export const getSalesmanOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const result = await salesService.getSalesmanOrdersService(
    req.params.salesmanId,
    parseInt(page, 10),
    parseInt(limit, 10),
    status
  );

  return ApiResponse.success(res, 200, 'Salesman orders retrieved successfully', result);
});

// Get salesman performance
export const getSalesmanPerformance = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  
  const performance = await salesService.getSalesmanPerformanceService(
    req.params.salesmanId,
    period
  );

  return ApiResponse.success(res, 200, 'Salesman performance retrieved successfully', performance);
});

// ==================== REPORT CONTROLLERS ====================

// Get sales reports
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, ...filters } = req.query;
  
  if (!startDate || !endDate) {
    return ApiResponse.badRequest(res, 'Start date and end date are required');
  }

  const report = await salesService.generateSalesReport(
    { startDate, endDate },
    filters
  );

  return ApiResponse.success(res, 200, 'Sales report generated successfully', report);
});

// Get performance reports
export const getPerformanceReport = asyncHandler(async (req, res) => {
  const { period = 'monthly', ...filters } = req.query;
  
  const report = await salesService.generatePerformanceReport(period, filters);

  return ApiResponse.success(res, 200, 'Performance report generated successfully', report);
});

// Get dashboard data
export const getDashboardData = asyncHandler(async (req, res) => {
  const salesmanId = req.query.salesmanId || null;
  const dashboard = await salesService.getDashboardData(salesmanId);

  return ApiResponse.success(res, 200, 'Sales dashboard data retrieved successfully', dashboard);
});

// ==================== WHATSAPP CONTROLLERS ====================

// Send order to WhatsApp group
export const sendToWhatsApp = asyncHandler(async (req, res) => {
  const order = await salesService.getOrderByIdService(req.params.orderId);
  
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const message = `🆕 New Order: ${order.orderId}
Customer: ${order.customer?.name}
Amount: ₹${order.orderDetails?.totalAmount}
Items: ${order.items?.length || 0} products`;

  const success = await salesService.sendWhatsAppMessage(order.orderId, message);

  if (success) {
    return ApiResponse.success(res, 200, 'Order sent to WhatsApp successfully');
  } else {
    return ApiResponse.internalError(res, 'Failed to send order to WhatsApp');
  }
});

// Get order notifications
export const getOrderNotifications = asyncHandler(async (req, res) => {
  const notifications = await salesService.getOrderNotificationsService(req.params.orderId);
  return ApiResponse.success(res, 200, 'Notifications retrieved successfully', notifications);
});

// ==================== DASHBOARD & STATS CONTROLLERS ====================

// Get comprehensive dashboard statistics for salesman
export const getSalesmanDashboardStats = asyncHandler(async (req, res) => {
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? (req.query.salesmanId || null) : (req.user?.id || req.user?._id);
  const { startDate, endDate } = req.query;

  const dateRange = {};
  if (startDate) dateRange.startDate = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateRange.endDate = end;
  }

  const stats = await salesService.getSalesmanDashboardStatsService(salesmanId, dateRange);
  return ApiResponse.success(res, 200, 'Dashboard statistics retrieved successfully', stats);
});

// Get enhanced order statistics
export const getEnhancedOrderStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? (req.query.salesmanId || null) : (req.user?.id || req.user?._id);

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const stats = await salesService.getEnhancedOrderStats(salesmanId, dateRange);
  return ApiResponse.success(res, 200, 'Enhanced order statistics retrieved successfully', stats);
});

// Get store sales statistics
export const getStoreSalesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? (req.query.salesmanId || null) : (req.user?.id || req.user?._id);

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const stats = await salesService.getStoreSalesStats(salesmanId, dateRange);
  return ApiResponse.success(res, 200, 'Store sales statistics retrieved successfully', stats);
});

// Get combined sales statistics
export const getCombinedSalesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? (req.query.salesmanId || null) : (req.user?.id || req.user?._id);

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const stats = await salesService.getCombinedSalesStats(salesmanId, dateRange);
  return ApiResponse.success(res, 200, 'Combined sales statistics retrieved successfully', stats);
});

// ==================== STORE INVOICE CONTROLLERS ====================

// Create store invoice
export const createStoreInvoice = asyncHandler(async (req, res) => {
  const invoiceData = req.body;
  const salesmanId = req.user?.id || req.user?._id;

  const isOldFormat = invoiceData.customerName && (invoiceData.salesmanName || invoiceData.items);
  let transformedData = invoiceData;

  if (isOldFormat && !invoiceData.customer) {
    transformedData = {
      receiptNumber: invoiceData.receiptNumber,
      customer: {
        name: invoiceData.customerName,
        phone: invoiceData.customerPhone || '',
        email: invoiceData.customerEmail || ''
      },
      items: (invoiceData.items || []).map(item => ({
        productName: item.productName || item.name,
        quantity: item.quantity,
        rate: item.rate
      })),
      payment: {
        method: invoiceData.paymentMethod || invoiceData.payment?.method || 'Cash',
        amount: invoiceData.advanceAmount || invoiceData.totalAmount || invoiceData.payment?.amount || 0,
        status: invoiceData.paymentStatus || invoiceData.payment?.status || 'completed'
      },
      totals: {
        subtotal: invoiceData.subtotal || 0,
        gst: invoiceData.gst || 18,
        total: invoiceData.totalAmount || 0
      },
      deviceType: invoiceData.deviceType || 'large',
      notes: invoiceData.notes || ''
    };
  }

  const invoice = await salesService.createStoreInvoiceService(transformedData, salesmanId);
  return ApiResponse.created(res, 'Store invoice created successfully', invoice);
});

// Get all store invoices
export const getStoreInvoices = asyncHandler(async (req, res) => {
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? null : (req.user?.id || req.user?._id);
  const { status, paymentStatus, dateFrom, dateTo, customerName } = req.query;

  const invoices = await salesService.getStoreInvoicesService(salesmanId, {
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    customerName
  });

  return ApiResponse.success(res, 200, 'Store invoices retrieved successfully', { storeInvoices: invoices });
});

// Get single store invoice by receipt number
export const getStoreInvoice = asyncHandler(async (req, res) => {
  const invoice = await salesService.getStoreInvoiceService(req.params.receiptNumber);
  return ApiResponse.success(res, 200, 'Store invoice retrieved successfully', invoice);
});

// Update store invoice
export const updateStoreInvoice = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const invoice = await salesService.updateStoreInvoiceService(req.params.receiptNumber, req.body, userId);
  return ApiResponse.success(res, 200, 'Store invoice updated successfully', invoice);
});

// Delete store invoice
export const deleteStoreInvoice = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const invoice = await salesService.deleteStoreInvoiceService(req.params.receiptNumber, userId);
  return ApiResponse.success(res, 200, 'Store invoice deleted successfully', invoice);
});

// Update store invoice payment
export const updateStoreInvoicePayment = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const invoice = await salesService.updateStoreInvoicePaymentService(req.params.receiptNumber, req.body, userId);
  return ApiResponse.success(res, 200, 'Store invoice payment updated successfully', invoice);
});

// Delete order
export const deleteOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const userRole = req.user?.role || 'salesman';
  const order = await salesService.deleteOrderService(req.params.orderId, userId, userRole);
  return ApiResponse.success(res, 200, 'Order deleted successfully', order);
});

// Get products catalog (placeholder)
export const getProducts = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, 'Products retrieved successfully', []);
});

// Generate PDF for store invoice
export const generateStoreInvoicePDF = asyncHandler(async (req, res) => {
  const { receiptNumber } = req.params;
  const salesmanId = (req.user?.role === 'admin' || req.user?.role === 'super_admin') ? null : (req.user?.id || req.user?._id);

  if (salesmanId) {
    const existingInvoice = await salesService.getStoreInvoiceService(receiptNumber);
    if (!existingInvoice) {
      return ApiResponse.notFound(res, 'Store invoice not found');
    }
    const invoiceSalesmanId = existingInvoice.salesman?._id?.toString() || existingInvoice.salesman?.toString();
    if (invoiceSalesmanId && invoiceSalesmanId !== salesmanId.toString()) {
      return ApiResponse.forbidden(res, 'You can only view PDFs for your own store invoices');
    }
  }

  const pdfData = await salesService.generateStoreInvoicePDFService(receiptNumber);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfData.fileName}"`);
  res.setHeader('Content-Length', pdfData.fileSize);
  return res.send(pdfData.buffer);
});

// Generate PDF for order
export const getOrderPDF = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await salesService.getOrderByIdService(orderId);
  if (!order) {
    return ApiResponse.notFound(res, 'Order not found');
  }

  const userRole = req.user?.role;
  const userId = req.user?.id || req.user?._id;
  if (userRole !== 'admin' && userRole !== 'super_admin' && order.salesman?.toString() !== userId?.toString()) {
    return ApiResponse.forbidden(res, 'You can only view PDFs for your own orders');
  }

  const pdfData = await salesService.generateOrderPDFService(orderId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfData.fileName}"`);
  res.setHeader('Content-Length', pdfData.fileSize);
  return res.send(pdfData.buffer);
});

// Generate Standalone Store Invoice (Direct from Form)
export const generateStandaloneStoreInvoice = asyncHandler(async (req, res) => {
  const storeInvoiceData = req.body;
  const isOldFormat = storeInvoiceData.customerName && !storeInvoiceData.customer;
  let normalizedData = storeInvoiceData;

  if (isOldFormat) {
    normalizedData = {
      receiptNumber: storeInvoiceData.receiptNumber || `SI-${Date.now()}`,
      customer: {
        name: storeInvoiceData.customerName,
        phone: storeInvoiceData.customerPhone || '',
        email: storeInvoiceData.customerEmail || ''
      },
      items: (storeInvoiceData.items || []).map(item => ({
        productName: item.productName || item.name,
        quantity: item.quantity,
        rate: item.rate
      })),
      payment: {
        method: storeInvoiceData.paymentMethod || 'Cash',
        amount: storeInvoiceData.amountPaid || storeInvoiceData.totalAmount || 0,
        status: 'completed'
      },
      totals: {
        subtotal: storeInvoiceData.subtotal || 0,
        gst: storeInvoiceData.gst || 18,
        total: storeInvoiceData.totalAmount || 0
      }
    };
  }

  const receiptNum = normalizedData.receiptNumber || `SI-${Date.now()}`;
  const pdfData = await salesService.generateStoreInvoicePDFService(receiptNum, normalizedData);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdfData.fileName}"`);
  res.setHeader('Content-Length', pdfData.fileSize);
  return res.send(pdfData.buffer);
});

// Generate Warranty Card PDF
export const generateWarrantyPDF = asyncHandler(async (req, res) => {
  const warrantyData = req.body || {};
  const orderId = req.params?.orderId || warrantyData.orderNumber || null;

  const pdfData = await salesService.generateWarrantyPDFService(warrantyData, orderId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfData.fileName}"`);
  res.setHeader('Content-Length', pdfData.fileSize);
  return res.send(pdfData.buffer);
});

export default {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  addPayment,
  createSalesman,
  getSalesmen,
  getSalesmanById,
  getSalesmanOrders,
  getSalesmanPerformance,
  getSalesReport,
  getPerformanceReport,
  getDashboardData,
  getSalesmanDashboardStats,
  getEnhancedOrderStats,
  getStoreSalesStats,
  getCombinedSalesStats,
  createStoreInvoice,
  getStoreInvoices,
  getStoreInvoice,
  updateStoreInvoice,
  deleteStoreInvoice,
  updateStoreInvoicePayment,
  generateStoreInvoicePDF,
  generateStandaloneStoreInvoice,
  generateWarrantyPDF,
  getOrderPDF,
  getProducts,
  sendToWhatsApp,
  getOrderNotifications
};

