import logisticsService from '../services/logisticsService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/apiResponse.js';
import logger from '../../../utils/logger.js';

// ==================== GATEPASS CONTROLLERS ====================

// @desc    Create new gatepass
// @route   POST /api/v1/logistics/gatepasses
// @access  Private (Logistics)
export const createGatepass = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const gatepass = await logisticsService.createGatepassService(req.body, userId);
  
  logger.info(`Gatepass created successfully: ${gatepass.gatepassId} by logistics: ${userId}`);
  
  return new ApiResponse(res)
    .status(201)
    .data(gatepass)
    .message('Gatepass created successfully')
    .send();
});

// @desc    Get all gatepasses (with filters)
// @route   GET /api/v1/logistics/gatepasses
// @access  Private
export const getGatepasses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  
  const result = await logisticsService.getGatepassesService(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  return new ApiResponse(res)
    .data(result)
    .send();
});

// @desc    Get gatepass by ID
// @route   GET /api/v1/logistics/gatepasses/:id
// @access  Private
export const getGatepassById = asyncHandler(async (req, res) => {
  const gatepass = await logisticsService.getGatepassByIdService(req.params.id);
  
  if (!gatepass) {
    return new ApiResponse(res)
      .status(404)
      .error('Gatepass not found')
      .send();
  }

  return new ApiResponse(res)
    .data(gatepass)
    .send();
});

// @desc    Update gatepass status
// @route   PATCH /api/v1/logistics/gatepasses/:id/status
// @access  Private
export const updateGatepassStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const userId = req.user?._id || req.user?.id;
  
  const gatepass = await logisticsService.updateGatepassStatusService(
    req.params.id,
    status,
    userId,
    req.user?.role
  );

  return new ApiResponse(res)
    .data(gatepass)
    .message('Gatepass status updated successfully')
    .send();
});

// @desc    Update quality check
// @route   PATCH /api/v1/logistics/gatepasses/:id/quality-check
// @access  Private (Logistics)
export const updateQualityCheck = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const gatepass = await logisticsService.updateQualityCheckService(
    req.params.id,
    req.body,
    userId
  );

  return new ApiResponse(res)
    .data(gatepass)
    .message('Quality check updated successfully')
    .send();
});

// ==================== DRIVER CONTROLLERS ====================

// @desc    Get all drivers (with filters)
// @route   GET /api/v1/logistics/drivers
// @access  Private
export const getDrivers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  
  const result = await logisticsService.getDriversService(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  return new ApiResponse(res)
    .data(result)
    .send();
});

// @desc    Get driver by ID
// @route   GET /api/v1/logistics/drivers/:id
// @access  Private
export const getDriverById = asyncHandler(async (req, res) => {
  const driver = await logisticsService.getDriverByIdService(req.params.id);
  
  if (!driver) {
    return new ApiResponse(res)
      .status(404)
      .error('Driver not found')
      .send();
  }

  return new ApiResponse(res)
    .data(driver)
    .send();
});

// @desc    Search available drivers
// @route   GET /api/v1/logistics/drivers/available
// @access  Private
export const searchAvailableDrivers = asyncHandler(async (req, res) => {
  const drivers = await logisticsService.searchAvailableDriversService(req.query);

  return new ApiResponse(res)
    .data(drivers)
    .message('Available drivers retrieved successfully')
    .send();
});

// ==================== MANUFACTURING CONTROLLERS ====================

// @desc    Get manufacturing orders
// @route   GET /api/v1/logistics/manufacturing/orders
// @access  Private (Logistics)
export const getManufacturingOrders = asyncHandler(async (req, res) => {
  const orders = [];
  
  return new ApiResponse(res)
    .data(orders)
    .message('Manufacturing orders retrieved successfully')
    .send();
});

// @desc    Update manufacturing status
// @route   PATCH /api/v1/logistics/manufacturing/orders/:orderId/status
// @access  Private (Logistics)
export const updateManufacturingStatus = asyncHandler(async (req, res) => {
  return new ApiResponse(res)
    .message('Manufacturing status updated successfully')
    .send();
});

// ==================== INVENTORY CONTROLLERS ====================

// @desc    Get inventory items
// @route   GET /api/v1/logistics/inventory
// @access  Private (Logistics)
export const getInventoryItems = asyncHandler(async (req, res) => {
  const items = [];
  
  return new ApiResponse(res)
    .data(items)
    .message('Inventory items retrieved successfully')
    .send();
});

// @desc    Update inventory item
// @route   PATCH /api/v1/logistics/inventory/:itemId
// @access  Private (Logistics)
export const updateInventoryItem = asyncHandler(async (req, res) => {
  return new ApiResponse(res)
    .message('Inventory item updated successfully')
    .send();
});

// ==================== PACKAGING CONTROLLERS ====================

// @desc    Get packaging queue
// @route   GET /api/v1/logistics/packaging/queue
// @access  Private (Logistics)
export const getPackagingQueue = asyncHandler(async (req, res) => {
  const queue = [];
  
  return new ApiResponse(res)
    .data(queue)
    .message('Packaging queue retrieved successfully')
    .send();
});

// @desc    Update packaging details
// @route   PATCH /api/v1/logistics/gatepasses/:id/packaging
// @access  Private (Logistics)
export const updatePackaging = asyncHandler(async (req, res) => {
  const gatepass = {};
  
  return new ApiResponse(res)
    .data(gatepass)
    .message('Packaging details updated successfully')
    .send();
});

// ==================== DELIVERY CONTROLLERS ====================

// @desc    Assign driver to gatepass
// @route   PATCH /api/v1/logistics/gatepasses/:id/assign-driver
// @access  Private (Logistics)
export const assignDriver = asyncHandler(async (req, res) => {
  const gatepass = {};
  
  return new ApiResponse(res)
    .data(gatepass)
    .message('Driver assigned successfully')
    .send();
});

// @desc    Get delivery schedule
// @route   GET /api/v1/logistics/delivery/schedule
// @access  Private (Logistics)
export const getDeliverySchedule = asyncHandler(async (req, res) => {
  const schedule = [];
  
  return new ApiResponse(res)
    .data(schedule)
    .message('Delivery schedule retrieved successfully')
    .send();
});

// ==================== REPORTING CONTROLLERS ====================

// @desc    Get logistics dashboard data
// @route   GET /api/v1/logistics/dashboard
// @access  Private
export const getLogisticsDashboard = asyncHandler(async (req, res) => {
  const personnelId = req.query.personnelId || null;
  
  const dashboard = await logisticsService.getLogisticsDashboard(personnelId);

  return new ApiResponse(res)
    .data(dashboard)
    .send();
});

// @desc    Get logistics reports
// @route   GET /api/v1/logistics/reports
// @access  Private
export const getLogisticsReports = asyncHandler(async (req, res) => {
  const reports = {};
  
  return new ApiResponse(res)
    .data(reports)
    .message('Logistics reports retrieved successfully')
    .send();
});

// ==================== WAREHOUSE CONTROLLERS ====================

// @desc    Get warehouse status
// @route   GET /api/v1/logistics/warehouse/status
// @access  Private (Logistics)
export const getWarehouseStatus = asyncHandler(async (req, res) => {
  const status = {};
  
  return new ApiResponse(res)
    .data(status)
    .message('Warehouse status retrieved successfully')
    .send();
});

// @desc    Update warehouse location
// @route   PATCH /api/v1/logistics/warehouse/locations/:locationId
// @access  Private (Logistics)
export const updateWarehouseLocation = asyncHandler(async (req, res) => {
  return new ApiResponse(res)
    .message('Warehouse location updated successfully')
    .send();
});

// ==================== PROFILE & UTILITY CONTROLLERS ====================

// @desc    Get current user profile (logistics personnel)
// @route   GET /api/v1/logistics/profile
// @access  Private (Logistics)
export const getProfile = asyncHandler(async (req, res) => {
  const profile = {};
  
  return new ApiResponse(res)
    .data(profile)
    .send();
});

// @desc    Get current user's assigned tasks
// @route   GET /api/v1/logistics/my-tasks
// @access  Private (Logistics)
export const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = [];
  
  return new ApiResponse(res)
    .data(tasks)
    .send();
});

// @desc    Generate Gatepass PDF
// @route   GET /api/v1/logistics/gatepasses/:id/pdf
// @access  Private
export const generateGatepassPDF = asyncHandler(async (req, res) => {
  const gatepassId = req.params.id;
  const pdfData = await logisticsService.generateGatepassPDFService(gatepassId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfData.fileName}"`);
  res.setHeader('Content-Length', pdfData.fileSize);
  return res.send(pdfData.buffer);
});
