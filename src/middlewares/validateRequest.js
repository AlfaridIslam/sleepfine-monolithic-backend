import Joi from 'joi';
import { ValidationError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Request validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Request source ('body', 'query', 'params', 'headers')
 */
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    if (!schema) return next();
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type,
      }));

      logger.logSecurity('validation_failed', {
        source,
        errors,
        ip: req.ip,
        url: req.url,
        method: req.method,
      });

      return next(new ValidationError('Validation failed', errors));
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'email', 'status'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100),
    filters: Joi.object().pattern(Joi.string(), Joi.any()),
  }),

  idParam: Joi.object({
    id: Joi.string().optional(),
    orderId: Joi.string().optional(),
    salesmanId: Joi.string().optional(),
    paymentId: Joi.string().optional(),
    invoiceId: Joi.string().optional(),
    reportId: Joi.string().optional(),
    gatepassId: Joi.string().optional(),
    notificationId: Joi.string().optional(),
    userId: Joi.string().optional(),
    settingKey: Joi.string().optional(),
  }),

  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required',
    }),

  phone: Joi.string()
    .pattern(/^\+?[0-9\s-]{7,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required',
    }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * Business-specific validation schemas
 */
export const businessSchemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
    userType: Joi.string()
      .trim()
      .lowercase()
      .valid('admin', 'salesman', 'accountant', 'logistics', 'driver')
      .required()
      .messages({
        'any.only': 'userType must be one of: admin, salesman, accountant, logistics, driver',
        'any.required': 'userType is required',
      }),
  }),

  // Order creation
  createOrder: Joi.object({
    customerName: Joi.string().min(2).max(100).optional(),
    customerPhone: Joi.string().optional(),
    customerEmail: Joi.string().email().optional(),
    customer: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().optional(),
      address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
      }).required(),
    }).optional(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().optional(),
        productName: Joi.string().optional(),
        name: Joi.string().optional(),
        quantity: Joi.number().integer().min(1).required(),
        unitPrice: Joi.number().min(0).required(),
        totalPrice: Joi.number().min(0).optional(),
        specifications: Joi.object().optional(),
        description: Joi.string().max(500).optional(),
      })
    ).min(1).required(),
    orderDetails: Joi.object({
      totalAmount: Joi.number().min(0).required(),
      advanceAmount: Joi.number().min(0).default(0),
      discount: Joi.number().min(0).default(0),
      taxAmount: Joi.number().min(0).default(0),
      notes: Joi.string().optional(),
    }).optional(),
    deliveryAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().optional(),
    }).optional(),
    paymentMethod: Joi.string().valid('cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque').optional(),
    notes: Joi.string().max(1000).optional(),
  }),

  // Payment creation
  createPayment: Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    paymentMethod: Joi.string().valid('cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque').required(),
    paymentType: Joi.string().valid('advance', 'full', 'partial').required(),
    transactionId: Joi.string().optional(),
    utrNumber: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
  }),

  // Sales schemas
  getOrders: commonSchemas.pagination,
  getOrderById: commonSchemas.idParam,
  updateOrder: Joi.object({
    customerName: Joi.string().min(2).max(100).optional(),
    customerPhone: Joi.string().optional(),
    customerEmail: Joi.string().email().optional(),
    items: Joi.array().items(Joi.object()).optional(),
    deliveryAddress: Joi.object().optional(),
    paymentMethod: Joi.string().valid('cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque').optional(),
    notes: Joi.string().max(1000).optional(),
  }),
  updateOrderStatus: Joi.object({
    status: Joi.string().valid('draft', 'pending_approval', 'approved', 'manufacturing', 'ready_for_dispatch', 'dispatched', 'delivered', 'cancelled', 'returned').required(),
    notes: Joi.string().max(500).optional(),
  }),
  addPayment: Joi.object({
    amount: Joi.number().positive().required(),
    paymentMethod: Joi.string().valid('cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque').required(),
    paymentType: Joi.string().valid('advance', 'full', 'partial').required(),
    transactionId: Joi.string().optional(),
    utrNumber: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
  }),
  createSalesman: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    employeeId: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().optional(),
    }).required(),
    salesTarget: Joi.object({
      monthly: Joi.number().positive().optional(),
      quarterly: Joi.number().positive().optional(),
      yearly: Joi.number().positive().optional(),
    }).optional(),
    commission: Joi.object({
      percentage: Joi.number().min(0).max(100).optional(),
      fixed: Joi.number().positive().optional(),
    }).optional(),
    password: commonSchemas.password,
  }),
  getSalesmanById: commonSchemas.idParam,
  getSalesmanOrders: commonSchemas.idParam,
  getSalesmanPerformance: commonSchemas.idParam,
  getSalesReport: commonSchemas.pagination,
  getPerformanceReport: commonSchemas.pagination,
  sendToWhatsApp: commonSchemas.idParam,
  getOrderNotifications: commonSchemas.idParam,

  // Accounts schemas
  verifyPayment: Joi.object({
    method: Joi.string().valid('manual', 'bank_statement', 'gateway_verification', 'receipt_verification').default('manual'),
    notes: Joi.string().max(500).optional()
  }),
  bulkVerifyPayments: Joi.object({
    paymentIds: Joi.array().items(Joi.string()).min(1).required(),
    method: Joi.string().valid('manual', 'bank_statement', 'gateway_verification', 'receipt_verification').default('manual'),
    notes: Joi.string().max(500).optional()
  }),
  getPayments: commonSchemas.pagination,
  updatePayment: Joi.object({
    amount: Joi.number().positive().optional(),
    method: Joi.string().valid('cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque').optional(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'cancelled').optional(),
    paymentDetails: Joi.object().optional(),
    notes: Joi.string().max(500).optional()
  }),
  createInvoice: Joi.object({
    orderId: Joi.string().required(),
    invoiceType: Joi.string().valid('proforma', 'tax_invoice', 'commercial', 'credit_note', 'debit_note').default('tax_invoice'),
    customer: Joi.object().required(),
    items: Joi.array().items(Joi.object()).min(1).required(),
    paymentTerms: Joi.object().optional(),
    notes: Joi.object().optional()
  }),
  updateInvoice: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled').optional(),
    paymentTerms: Joi.object().optional(),
    notes: Joi.object().optional()
  }),
  markInvoicePaid: Joi.object({
    paymentAmount: Joi.number().positive().required(),
    paymentDate: Joi.date().optional()
  }),
  generateFinancialReport: Joi.object({
    reportType: Joi.string().required(),
    reportName: Joi.string().required(),
    description: Joi.string().optional(),
    reportPeriod: Joi.string().required(),
    dateRange: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required()
    }).required(),
    filters: Joi.object().optional()
  }),
  createAccountant: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    employeeId: Joi.string().required(),
    specialization: Joi.string().optional(),
    certifications: Joi.array().optional(),
    assignedDepartments: Joi.array().optional(),
    password: commonSchemas.password
  }),
  updateAccountant: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().optional(),
    specialization: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    status: Joi.string().optional()
  }),
  getAccountsReport: commonSchemas.pagination,
  getFinancialReport: commonSchemas.pagination,

  // Admin schemas
  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'terminated').optional(),
    permissions: Joi.array().items(Joi.string()).optional()
  }),
  updateSystemSetting: Joi.object({
    value: Joi.any().required()
  }),
  importSystemSettings: Joi.object({
    settings: Joi.array().items(Joi.object({
      settingKey: Joi.string().required(),
      value: Joi.any().required()
    })).min(1).required(),
    overwrite: Joi.boolean().default(false)
  }),
  generateCustomReport: Joi.object({
    reportType: Joi.string().required(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    filters: Joi.object().optional()
  }),
  updateSystemConfig: Joi.object({
    configurations: Joi.array().items(Joi.object({
      key: Joi.string().required(),
      value: Joi.any().required()
    })).min(1).required()
  }),

  // Logistics schemas
  createGatepass: Joi.object({
    orderId: Joi.string().required(),
    advancePayment: Joi.number().min(0).optional(),
    pendingAmount: Joi.number().min(0).optional(),
    driverId: Joi.string().required(),
    vehicleNumber: Joi.string().required(),
    notes: Joi.string().max(500).optional(),
  }),
  getGatepasses: commonSchemas.pagination,
  getGatepassById: commonSchemas.idParam,
  updateGatepass: Joi.object({
    status: Joi.string().valid('active', 'completed', 'cancelled', 'used', 'expired').required(),
    notes: Joi.string().max(500).optional(),
  }),
  updateGatepassStatus: Joi.object({
    status: Joi.string().valid('active', 'completed', 'cancelled', 'used', 'expired').required(),
    notes: Joi.string().max(500).optional(),
  }),
  updateManufacturingStatus: Joi.object({
    status: Joi.string().valid('started', 'in_progress', 'completed').required(),
    notes: Joi.string().max(500).optional(),
  }),
  performQualityCheck: Joi.object({
    passed: Joi.boolean().required(),
    issues: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().max(500).optional(),
  }),
  updateQualityCheck: Joi.object({
    qualityStatus: Joi.string().valid('pending', 'passed', 'failed', 'conditional').required(),
    qualityNotes: Joi.string().max(500).optional(),
    passed: Joi.boolean().optional(),
    issues: Joi.array().items(Joi.string()).optional(),
  }),
  updatePackagingStatus: Joi.object({
    status: Joi.string().valid('pending', 'packaging', 'completed').required(),
    notes: Joi.string().max(500).optional(),
  }),
  updatePackaging: Joi.object({
    packagingType: Joi.string().valid('standard', 'fragile', 'bulk', 'custom').optional(),
    packagingNotes: Joi.string().max(500).optional(),
    weight: Joi.number().min(0).optional(),
    dimensions: Joi.object().optional(),
    status: Joi.string().optional(),
  }),
  assignDriver: Joi.object({
    driverId: Joi.string().required(),
    vehicleNumber: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
  }),
  getDriverById: commonSchemas.idParam,
  updateInventoryItem: Joi.object({
    quantity: Joi.number().optional(),
    location: Joi.string().optional(),
    notes: Joi.string().optional(),
  }),
  updateWarehouseLocation: Joi.object({
    location: Joi.string().optional(),
    capacity: Joi.number().optional(),
    notes: Joi.string().optional(),
  }),
  createLogistics: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    employeeId: Joi.string().required(),
    specialization: Joi.string().optional(),
    assignedWarehouse: Joi.string().optional(),
    assignedZone: Joi.string().optional(),
    password: commonSchemas.password,
  }),
  getLogisticsReport: commonSchemas.pagination,

  // Notifications schemas
  createNotification: Joi.object({
    type: Joi.string().valid('order_update', 'payment_update', 'delivery_update', 'manufacturing_update', 'system_alert', 'reminder', 'announcement').required(),
    title: Joi.string().min(2).max(200).required(),
    message: Joi.string().min(2).max(1000).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'whatsapp', 'push', 'in_app', 'webhook')).min(1).default(['in_app']),
    recipients: Joi.array().items(Joi.object({
      userId: Joi.string().optional(),
      userModel: Joi.string().valid('Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant').optional(),
      role: Joi.string().valid('admin', 'salesman', 'logistics', 'driver', 'accounts').required()
    })).min(1).required(),
    relatedEntity: Joi.object({
      entityType: Joi.string().valid('order', 'payment', 'gatepass', 'user', 'system').optional(),
      entityId: Joi.string().optional(),
      orderId: Joi.string().optional()
    }).optional(),
    metadata: Joi.object().optional()
  }),

  createFromTemplate: Joi.object({
    templateType: Joi.string().required(),
    variables: Joi.object().required(),
    recipients: Joi.array().items(Joi.object({
      userId: Joi.string().optional(),
      userModel: Joi.string().valid('Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant').optional(),
      role: Joi.string().valid('admin', 'salesman', 'logistics', 'driver', 'accounts').required()
    })).min(1).required()
  }),

  createOrderNotification: Joi.object({
    orderId: Joi.string().required(),
    customer: Joi.object({
      name: Joi.string().required()
    }).required(),
    orderDetails: Joi.object({
      totalAmount: Joi.number().min(0).required()
    }).required(),
    items: Joi.array().min(1).required(),
    salesmanName: Joi.string().required()
  }),

  createGatepassNotification: Joi.object({
    gatepassId: Joi.string().required(),
    orderId: Joi.string().required(),
    order: Joi.object().optional(),
    paymentDetails: Joi.object().required(),
    deliveryDetails: Joi.object().optional(),
    validUntil: Joi.date().optional()
  }),

  createDeliveryNotification: Joi.object({
    orderId: Joi.string().required(),
    gatepassId: Joi.string().required(),
    customerName: Joi.string().required(),
    driverName: Joi.string().required(),
    paymentReceived: Joi.number().min(0).default(0),
    paymentMethod: Joi.string().valid('cash', 'online', 'card', 'upi').default('cash')
  }),

  systemBroadcast: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    message: Joi.string().min(2).max(1000).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    targetRoles: Joi.array().items(Joi.string().valid('admin', 'salesman', 'logistics', 'driver', 'accounts')).default([])
  }),

  getNotifications: commonSchemas.pagination,
  markAsRead: commonSchemas.idParam,
  sendNotification: commonSchemas.idParam,
  createTemplate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    title: Joi.string().min(2).max(100).required(),
    message: Joi.string().min(2).max(500).required(),
    type: Joi.string().valid('info', 'warning', 'error', 'success').required(),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'whatsapp', 'push')).min(1).required(),
  }),
  getNotificationReport: commonSchemas.pagination,
};

export const authSchemas = {
  login: businessSchemas.login,
};

export default validateRequest;
