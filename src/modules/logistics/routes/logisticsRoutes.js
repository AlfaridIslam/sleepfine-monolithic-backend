import express from 'express';
import { authenticate, authorize, requirePermission } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';
import * as logisticsController from '../controllers/logisticsController.js';
import { ROLES } from '../../../constants/roles.js';

const router = express.Router();

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logistics Service is running',
    timestamp: new Date().toISOString(),
    service: 'logistics',
    version: '1.0.0'
  });
});

// ==================== GATEPASS ROUTES ====================

// Create new gatepass
router.post('/gatepasses',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('create_gatepass'),
  validateRequest(businessSchemas.createGatepass),
  logisticsController.createGatepass
);

// Get all gatepasses (with filters)
router.get('/gatepasses',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER, ROLES.ACCOUNTS]),
  requirePermission('view_gatepass'),
  validateRequest(businessSchemas.getGatepasses, 'query'),
  logisticsController.getGatepasses
);

// Get gatepass by ID
router.get('/gatepasses/:id',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER, ROLES.ACCOUNTS]),
  requirePermission('view_gatepass'),
  validateRequest(businessSchemas.getGatepassById, 'params'),
  logisticsController.getGatepassById
);

// Get gatepass PDF
router.get('/gatepasses/:id/pdf',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER, ROLES.ACCOUNTS]),
  logisticsController.generateGatepassPDF
);

// Update gatepass status
router.patch('/gatepasses/:id/status',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER]),
  requirePermission('update_gatepass'),
  validateRequest(businessSchemas.updateGatepassStatus),
  logisticsController.updateGatepassStatus
);

// Update quality check
router.patch('/gatepasses/:id/quality-check',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_quality_check'),
  validateRequest(businessSchemas.updateQualityCheck),
  logisticsController.updateQualityCheck
);

// Update packaging details
router.patch('/gatepasses/:id/packaging',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_packaging'),
  validateRequest(businessSchemas.updatePackaging),
  logisticsController.updatePackaging
);

// Assign driver to gatepass
router.patch('/gatepasses/:id/assign-driver',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('assign_drivers'),
  validateRequest(businessSchemas.assignDriver),
  logisticsController.assignDriver
);

// ==================== DRIVER ROUTES ====================

// Get all drivers (with filters)
router.get('/drivers',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('view_driver_reports'),
  logisticsController.getDrivers
);

// Get driver by ID
router.get('/drivers/:id',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER]),
  requirePermission('view_driver_reports'),
  validateRequest(businessSchemas.getDriverById, 'params'),
  logisticsController.getDriverById
);

// Search available drivers
router.get('/drivers/available',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('assign_drivers'),
  logisticsController.searchAvailableDrivers
);

// ==================== MANUFACTURING ROUTES ====================

// Get manufacturing orders
router.get('/manufacturing/orders',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_manufacturing'),
  logisticsController.getManufacturingOrders
);

// Update manufacturing status
router.patch('/manufacturing/orders/:orderId/status',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_manufacturing'),
  validateRequest(businessSchemas.updateManufacturingStatus),
  logisticsController.updateManufacturingStatus
);

// ==================== INVENTORY ROUTES ====================

// Get inventory items
router.get('/inventory',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('view_inventory'),
  logisticsController.getInventoryItems
);

// Update inventory item
router.patch('/inventory/:itemId',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('update_inventory'),
  validateRequest(businessSchemas.updateInventoryItem),
  logisticsController.updateInventoryItem
);

// ==================== PACKAGING ROUTES ====================

// Get packaging queue
router.get('/packaging/queue',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_packaging'),
  logisticsController.getPackagingQueue
);

// ==================== DELIVERY ROUTES ====================

// Get delivery schedule
router.get('/delivery/schedule',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN, ROLES.DRIVER]),
  requirePermission('view_delivery_reports'),
  logisticsController.getDeliverySchedule
);

// ==================== WAREHOUSE ROUTES ====================

// Get warehouse status
router.get('/warehouse/status',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('view_warehouse_reports'),
  logisticsController.getWarehouseStatus
);

// Update warehouse location
router.patch('/warehouse/locations/:locationId',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('manage_warehouse'),
  validateRequest(businessSchemas.updateWarehouseLocation),
  logisticsController.updateWarehouseLocation
);

// ==================== REPORTING ROUTES ====================

// Get logistics dashboard data
router.get('/dashboard',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('view_delivery_reports'),
  logisticsController.getLogisticsDashboard
);

// Get logistics reports
router.get('/reports',
  authenticate,
  authorize([ROLES.LOGISTICS, ROLES.ADMIN]),
  requirePermission('view_delivery_reports'),
  logisticsController.getLogisticsReports
);

// ==================== PROFILE & UTILITY ROUTES ====================

// Get current user profile
router.get('/profile',
  authenticate,
  authorize([ROLES.LOGISTICS]),
  logisticsController.getProfile
);

// Get current user's assigned tasks
router.get('/my-tasks',
  authenticate,
  authorize([ROLES.LOGISTICS]),
  logisticsController.getMyTasks
);

export default router;
