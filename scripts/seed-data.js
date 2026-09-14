import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models from monolithic modules
import Admin from '../src/modules/admin/models/Admin.js';
import AuditLog from '../src/modules/admin/models/AuditLog.js';
import SystemSettings from '../src/modules/admin/models/SystemSettings.js';
import Salesman from '../src/modules/sales/models/Salesman.js';
import Order from '../src/modules/sales/models/Order.js';
import Accountant from '../src/modules/accounts/models/Accountant.js';
import Payment from '../src/modules/accounts/models/Payment.js';
import Invoice from '../src/modules/accounts/models/Invoice.js';
import FinancialReport from '../src/modules/accounts/models/FinancialReport.js';
import Logistics from '../src/modules/logistics/models/Logistics.js';
import Driver from '../src/modules/logistics/models/Driver.js';
import Gatepass from '../src/modules/logistics/models/Gatepass.js';
import Notification from '../src/modules/notifications/models/Notification.js';
import NotificationTemplate from '../src/modules/notifications/models/NotificationTemplate.js';

// Import domain services
import accountsService from '../src/modules/accounts/services/accountsService.js';
import adminService from '../src/modules/admin/services/adminService.js';

// Import config and logger
import config from '../src/config/index.js';
import { connectDB } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data
const sampleData = {
  admin: {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@sleepfine.com',
    phone: '1234567890',
    password: 'Admin@123',
    employeeId: 'ADM001',
    role: 'super_admin',
    permissions: [
      'manage_users',
      'manage_roles',
      'view_reports',
      'manage_system',
      'manage_inventory',
      'manage_orders',
      'manage_payments',
      'manage_deliveries',
      'view_logs',
      'manage_settings',
    ],
    address: {
      street: '123 Admin Street',
      city: 'Admin City',
      state: 'Admin State',
      zipCode: '12345',
      country: 'Admin Country',
    },
  },
  salesman: {
    firstName: 'John',
    lastName: 'Salesman',
    email: 'john@salesman.com',
    phone: '1234567891',
    password: 'Sales@123',
    employeeId: 'SAL001',
    role: 'salesman',
    permissions: [
      'create_order',
      'view_order',
      'update_order',
      'view_own_orders',
      'view_sales_reports',
      'view_own_performance',
      'create_customer',
      'view_customer',
      'update_customer',
      'view_products',
      'view_pricing',
      'send_notifications',
    ],
    address: {
      street: '456 Sales Street',
      city: 'Sales City',
      state: 'Sales State',
      zipCode: '67890',
      country: 'Sales Country',
    },
    salesTarget: {
      monthly: 50000,
      quarterly: 150000,
      yearly: 600000,
    },
    commission: {
      percentage: 5,
      fixed: 0,
    },
  },
  accountant: {
    firstName: 'Jane',
    lastName: 'Accountant',
    email: 'jane@accountant.com',
    phone: '1234567892',
    password: 'Account@123',
    employeeId: 'ACC001',
    role: 'accountant',
    permissions: [
      'view_payments',
      'update_payments',
      'verify_payments',
      'view_accounts_reports',
      'create_accounts_reports',
      'view_financial_data',
      'update_financial_data',
      'view_audit_logs',
      'reconcile_accounts',
      'manage_tax_records',
      'view_invoice',
      'create_invoice',
      'update_invoice',
      'view_receipts',
      'create_receipts',
      'update_receipts',
    ],
    address: {
      street: '789 Account Street',
      city: 'Account City',
      state: 'Account State',
      zipCode: '11111',
      country: 'Account Country',
    },
    specialization: 'general',
    certifications: [{ name: 'CPA', issuingBody: 'AICPA' }, { name: 'CMA', issuingBody: 'IMA' }],
  },
  logistics: {
    firstName: 'Mike',
    lastName: 'Logistics',
    email: 'mike@logistics.com',
    phone: '1234567893',
    password: 'Logistics@123',
    employeeId: 'LOG001',
    role: 'logistics',
    permissions: [
      'view_orders',
      'update_orders',
      'manage_manufacturing',
      'create_gatepass',
      'update_gatepass',
      'view_gatepass',
      'manage_inventory',
      'update_inventory',
      'view_inventory',
      'manage_delivery',
      'update_delivery_status',
      'view_delivery_reports',
      'manage_quality_check',
      'view_quality_reports',
      'manage_packaging',
      'view_packaging_reports',
      'assign_drivers',
      'view_driver_reports',
      'manage_warehouse',
      'view_warehouse_reports',
    ],
    address: {
      street: '321 Logistics Street',
      city: 'Logistics City',
      state: 'Logistics State',
      zipCode: '22222',
      country: 'Logistics Country',
    },
    specialization: 'warehouse',
    assignedWarehouse: 'Main Warehouse',
    assignedZone: 'Zone A',
  },
  driver: {
    firstName: 'Rajesh',
    lastName: 'Driver',
    email: 'driver@sleepfine.com',
    phone: '9876543210',
    password: 'Driver@123',
    employeeId: 'DRV001',
    role: 'driver',
    address: {
      street: '456 Transport Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    vehicle: {
      type: 'truck',
      number: 'KA01AB1234',
      model: 'Tata Ace',
      year: 2022
    },
    license: {
      number: 'DL1234567890123',
      type: 'commercial',
      expiryDate: new Date('2030-01-01'),
      issuingAuthority: 'RTO Bangalore'
    },
    emergencyContact: {
      name: 'Sunita',
      relationship: 'Spouse',
      phone: '9876543211'
    }
  },
  notificationTemplates: [
    {
      templateId: 'TPL_ORDER_CREATED',
      name: 'Order Created Notification',
      description: 'Template for notifying when a new order is created',
      type: 'order_created',
      category: 'order',
      priority: 'high',
      channels: ['whatsapp', 'in_app'],
      targetRoles: ['logistics', 'admin'],
      templates: {
        title: 'New Order Created - {{orderId}}',
        message: 'A new order has been created by {{salesmanName}}. Order ID: {{orderId}}, Customer: {{customerName}}, Total: ₹{{totalAmount}}',
        whatsappMessage: '🆕 New Order Created!\n\nOrder ID: {{orderId}}\nCustomer: {{customerName}}\nTotal Amount: ₹{{totalAmount}}\nItems: {{itemCount}} products\nSalesman: {{salesmanName}}\nDate: {{createdDate}}\n\nPlease start manufacturing process.'
      },
      variables: [
        { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'totalAmount', type: 'number', required: true, description: 'Total order amount' },
        { name: 'itemCount', type: 'number', required: true, description: 'Number of items' },
        { name: 'salesmanName', type: 'string', required: true, description: 'Salesman name' },
        { name: 'createdDate', type: 'date', required: true, description: 'Order creation date' }
      ],
      whatsappConfig: {
        groupUrl: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        isManual: true,
        instructions: 'Please manually share this order information in the logistics WhatsApp group'
      },
      isActive: true,
      version: 1
    },
    {
      templateId: 'TPL_GATEPASS_CREATED',
      name: 'Gatepass Created Notification',
      description: 'Template for notifying when a gatepass is created',
      type: 'gatepass_created',
      category: 'gatepass',
      priority: 'high',
      channels: ['whatsapp', 'in_app'],
      targetRoles: ['driver', 'admin'],
      templates: {
        title: 'Gatepass Created - {{gatepassId}}',
        message: 'Gatepass created for Order {{orderId}}. Driver: {{driverName}}, Vehicle: {{vehicleNumber}}',
        whatsappMessage: '🎫 New Gatepass Created!\n\nGatepass ID: {{gatepassId}}\nOrder ID: {{orderId}}\nCustomer: {{customerName}}\nTotal Amount: ₹{{totalAmount}}\nDriver: {{driverName}}\nVehicle: {{vehicleNumber}}\nValid Until: {{validUntil}}\nDate: {{createdDate}}\n\nReady for delivery!'
      },
      variables: [
        { name: 'gatepassId', type: 'string', required: true, description: 'Gatepass ID' },
        { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'totalAmount', type: 'number', required: true, description: 'Total amount' },
        { name: 'driverName', type: 'string', required: false, description: 'Driver name' },
        { name: 'vehicleNumber', type: 'string', required: false, description: 'Vehicle number' },
        { name: 'validUntil', type: 'date', required: false, description: 'Gatepass validity' },
        { name: 'createdDate', type: 'date', required: true, description: 'Creation date' }
      ],
      whatsappConfig: {
        groupUrl: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        isManual: true,
        instructions: 'Please manually share this gatepass information in the delivery WhatsApp group'
      },
      isActive: true,
      version: 1
    },
    {
      templateId: 'TPL_DELIVERY_COMPLETED',
      name: 'Delivery Completed Notification',
      description: 'Template for notifying when delivery is completed',
      type: 'delivery_completed',
      category: 'delivery',
      priority: 'high',
      channels: ['whatsapp', 'in_app'],
      targetRoles: ['salesman', 'accounts', 'admin'],
      templates: {
        title: 'Delivery Completed - {{orderId}}',
        message: 'Order {{orderId}} has been successfully delivered to {{customerName}}. Payment: ₹{{paymentReceived}}',
        whatsappMessage: '✅ Delivery Completed!\n\nOrder ID: {{orderId}}\nGatepass ID: {{gatepassId}}\nCustomer: {{customerName}}\nDelivery Date: {{deliveryDate}}\nDriver: {{driverName}}\nPayment Received: ₹{{paymentReceived}}\nPayment Method: {{paymentMethod}}\n\nOrder successfully delivered and payment collected!'
      },
      variables: [
        { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
        { name: 'gatepassId', type: 'string', required: true, description: 'Gatepass ID' },
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'deliveryDate', type: 'date', required: true, description: 'Delivery date' },
        { name: 'driverName', type: 'string', required: true, description: 'Driver name' },
        { name: 'paymentReceived', type: 'number', required: true, description: 'Payment received' },
        { name: 'paymentMethod', type: 'string', required: true, description: 'Payment method' }
      ],
      whatsappConfig: {
        groupUrl: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        isManual: true,
        instructions: 'Please manually share this delivery confirmation in the WhatsApp group'
      },
      isActive: true,
      version: 1
    },
    {
      templateId: 'TPL_PAYMENT_RECEIVED',
      name: 'Payment Received Notification',
      description: 'Template for notifying when payment is received',
      type: 'payment_received',
      category: 'payment',
      priority: 'medium',
      channels: ['in_app'],
      targetRoles: ['accounts', 'admin'],
      templates: {
        title: 'Payment Received - {{orderId}}',
        message: 'Payment of ₹{{amount}} received for Order {{orderId}} via {{paymentMethod}}',
        whatsappMessage: '💰 Payment Received!\n\nOrder ID: {{orderId}}\nAmount: ₹{{amount}}\nPayment Method: {{paymentMethod}}\nDate: {{paymentDate}}\n\nPayment successfully processed!'
      },
      variables: [
        { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
        { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
        { name: 'paymentMethod', type: 'string', required: true, description: 'Payment method' },
        { name: 'paymentDate', type: 'date', required: true, description: 'Payment date' }
      ],
      isActive: true,
      version: 1
    },
    {
      templateId: 'TPL_SYSTEM_ALERT',
      name: 'System Alert Notification',
      description: 'Template for system alerts and announcements',
      type: 'system_alert',
      category: 'system',
      priority: 'urgent',
      channels: ['in_app', 'whatsapp'],
      targetRoles: ['admin'],
      templates: {
        title: 'System Alert: {{alertTitle}}',
        message: '{{alertMessage}}',
        whatsappMessage: '⚠️ System Alert!\n\n{{alertTitle}}\n\n{{alertMessage}}\n\nPlease take immediate action if required.'
      },
      variables: [
        { name: 'alertTitle', type: 'string', required: true, description: 'Alert title' },
        { name: 'alertMessage', type: 'string', required: true, description: 'Alert message' }
      ],
      whatsappConfig: {
        groupUrl: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        isManual: true,
        instructions: 'Please manually share this system alert in the WhatsApp group if critical'
      },
      isActive: true,
      version: 1
    }
  ]
};

const seedData = async () => {
  try {
    logger.info('Starting to seed monolithic database...');

    // Clear existing collections
    await Admin.deleteMany({});
    await Salesman.deleteMany({});
    await Accountant.deleteMany({});
    await Logistics.deleteMany({});
    await Driver.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Gatepass.deleteMany({});
    await Notification.deleteMany({});
    await NotificationTemplate.deleteMany({});
    await Invoice.deleteMany({});
    await FinancialReport.deleteMany({});
    await SystemSettings.deleteMany({});
    await AuditLog.deleteMany({});
    logger.info('Existing collections cleared');

    // Create Admin
    const admin = new Admin(sampleData.admin);
    await admin.save();
    logger.info('Admin created successfully');

    // Create Salesman
    const salesman = new Salesman(sampleData.salesman);
    await salesman.save();
    logger.info('Salesman created successfully');

    // Create Accountant
    const accountant = new Accountant(sampleData.accountant);
    await accountant.save();
    logger.info('Accountant created successfully');

    // Create Logistics
    const logistics = new Logistics(sampleData.logistics);
    await logistics.save();
    logger.info('Logistics created successfully');

    // Create Driver
    const driver = new Driver(sampleData.driver);
    await driver.save();
    logger.info('Driver created successfully');

    // Create Sample Order
    const order = new Order({
      orderId: 'ORD001',
      salesman: salesman._id,
      customer: {
        name: 'Sample Customer',
        phone: '1234567894',
        email: 'customer@example.com',
        address: {
          street: '123 Customer Street',
          city: 'Customer City',
          state: 'Customer State',
          zipCode: '33333',
        },
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'SleepFine Orthopedic Mattress',
          name: 'SleepFine Orthopedic Mattress',
          quantity: 2,
          unitPrice: 1000,
          totalPrice: 2000,
          description: 'Premium Orthopedic Memory Foam Mattress',
        },
      ],
      orderDetails: {
        totalAmount: 2000,
        advanceAmount: 500,
        pendingAmount: 1500,
        discount: 0,
        taxAmount: 0
      },
      deliveryAddress: {
        street: '123 Customer Street',
        city: 'Customer City',
        state: 'Customer State',
        zipCode: '33333',
        country: 'India',
      },
      paymentMethod: 'cash',
      notes: 'Sample order for testing',
      status: 'confirmed'
    });
    await order.save();
    logger.info('Sample Order created successfully');

    // Create Sample Payment
    const payment = new Payment({
      paymentId: 'PAY001',
      transactionId: 'TXN001',
      orderId: order.orderId,
      order: order._id,
      amount: 500,
      method: 'cash',
      paymentType: 'advance',
      status: 'completed',
      collectedBy: salesman._id,
      collectedByModel: 'Salesman',
      notes: 'Advance payment for sample order',
    });
    await payment.save();
    logger.info('Sample Payment created successfully');

    // Create Sample Gatepass
    const gatepass = new Gatepass({
      gatepassId: 'GP001',
      orderId: order.orderId,
      order: order._id,
      issuedBy: logistics._id,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: [
        {
          productId: order.items[0].productId,
          productName: order.items[0].productName || 'SleepFine Orthopedic Mattress',
          quantity: order.items[0].quantity
        }
      ],
      deliveryDetails: {
        driver: driver._id,
        vehicleNumber: driver.vehicle.number,
        vehicleType: driver.vehicle.type,
        deliveryStatus: 'pending'
      },
      paymentDetails: {
        totalAmount: 2000,
        advanceAmount: 500,
        pendingAmount: 1500,
        paymentStatus: 'partial',
        paymentMethod: 'cash'
      },
      status: 'active',
      notes: 'Sample gatepass for testing',
    });
    await gatepass.save();
    logger.info('Sample Gatepass created successfully');

    // Create Sample Notification
    const notification = new Notification({
      notificationId: 'NOT001',
      type: 'order_update',
      title: 'New Order Created',
      message: 'Order ORD001 has been created successfully',
      priority: 'medium',
      status: 'sent',
      isSystemGenerated: true,
      recipients: [
        {
          userId: salesman._id,
          userModel: 'Salesman',
          role: 'salesman',
          isRead: false,
        },
      ],
      channels: ['in_app'],
      relatedEntity: {
        entityType: 'order',
        entityId: order._id.toString(),
        orderId: 'ORD001'
      },
      metadata: {
        orderNumber: 'ORD001',
      },
    });
    await notification.save();
    logger.info('Sample Notification created successfully');

    // Create Notification Templates
    for (const templateData of sampleData.notificationTemplates) {
      const template = new NotificationTemplate({
        ...templateData,
        createdBy: admin._id,
        createdByModel: 'Admin'
      });
      await template.save();
    }
    logger.info(`${sampleData.notificationTemplates.length} Notification Templates created successfully`);

    // Create Sample Invoice via Service (with GST and total calculations)
    await accountsService.createInvoiceService({
      invoiceNumber: 'INV001',
      orderId: order.orderId,
      order: order._id,
      invoiceType: 'tax_invoice',
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
        gstin: 'GST123456789',
        panNumber: 'ABCDE1234F'
      },
      items: order.items.map(item => ({
        name: item.productName || item.name || 'SleepFine Orthopedic Mattress',
        description: item.description || 'Sample Item Description',
        quantity: item.quantity,
        unit: 'piece',
        rate: item.unitPrice,
        discount: 0,
        discountType: 'percentage',
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0
      })),
      paymentTerms: {
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: ['cash', 'online'],
        lateFee: 100
      },
      notes: {
        publicNotes: 'Thank you for your business!',
        privateNotes: 'Sample invoice for testing',
        termsAndConditions: 'Payment due within 30 days'
      }
    }, accountant._id);
    logger.info('Sample Invoice created successfully');

    // Create Sample Financial Report
    const report = new FinancialReport({
      reportId: 'REP001',
      reportType: 'sales_report',
      reportName: 'Monthly Sales Report - Sample',
      description: 'Sample monthly sales report for testing',
      reportPeriod: 'monthly',
      dateRange: {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 0, 31)
      },
      status: 'completed',
      data: {
        summary: {
          totalRevenue: 50000,
          totalExpenses: 30000,
          netProfit: 20000,
          grossMargin: 40,
          netMargin: 40
        },
        salesData: {
          totalSales: 50000,
          totalOrders: 25,
          averageOrderValue: 2000,
          topProducts: [],
          salesByRegion: [],
          salesByPeriod: []
        },
        paymentData: {
          totalCollected: 45000,
          totalPending: 5000,
          collectionEfficiency: 90,
          paymentMethods: [],
          overdueAmount: 0,
          averageCollectionPeriod: 15
        }
      },
      createdBy: admin._id,
      createdByModel: 'Admin'
    });
    await report.save();
    logger.info('Sample Financial Report created successfully');

    // Create Sample System Settings
    const systemSettings = [
      {
        settingKey: 'app.name',
        settingName: 'Application Name',
        description: 'The name of the application',
        category: 'general',
        dataType: 'string',
        value: 'SleepFine Monolithic Backend',
        defaultValue: 'SleepFine Monolithic Backend',
        isEditable: true,
        isVisible: true,
        accessLevel: 'admin',
        environment: ['all'],
        lastModifiedBy: admin._id
      },
      {
        settingKey: 'app.version',
        settingName: 'Application Version',
        description: 'Current version of the application',
        category: 'general',
        dataType: 'string',
        value: '1.0.0',
        defaultValue: '1.0.0',
        isEditable: false,
        isVisible: true,
        accessLevel: 'admin',
        environment: ['all'],
        lastModifiedBy: admin._id
      },
      {
        settingKey: 'security.maxLoginAttempts',
        settingName: 'Maximum Login Attempts',
        description: 'Maximum number of failed login attempts before account lockout',
        category: 'security',
        dataType: 'number',
        value: 5,
        defaultValue: 5,
        validation: { min: 3, max: 10 },
        isEditable: true,
        isVisible: true,
        accessLevel: 'super_admin',
        environment: ['all'],
        lastModifiedBy: admin._id
      },
      {
        settingKey: 'whatsapp.groupUrl',
        settingName: 'WhatsApp Group URL',
        description: 'URL for the WhatsApp group for notifications',
        category: 'integrations',
        dataType: 'string',
        value: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        defaultValue: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
        isEditable: true,
        isVisible: true,
        accessLevel: 'admin',
        environment: ['all'],
        lastModifiedBy: admin._id
      }
    ];

    for (const settingData of systemSettings) {
      const setting = new SystemSettings(settingData);
      await setting.save();
    }
    logger.info(`${systemSettings.length} System Settings created successfully`);

    // Create Sample Audit Log via Service (with logId, retentionDate, and severity calculations)
    await adminService.createAuditLog({
      action: 'System Initialization',
      actionType: 'create',
      resource: 'system',
      resourceId: 'system_init',
      service: 'monolithic',
      userId: admin._id,
      userModel: 'Admin',
      userDetails: {
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        role: admin.role,
        employeeId: admin.employeeId
      },
      metadata: {
        endpoint: '/api/v1/system/init',
        method: 'POST',
        statusCode: 200
      },
      category: 'system_change',
      status: 'success'
    });
    logger.info('Sample Audit Log created successfully');

    logger.info('==========================================');
    logger.info(' All Monolithic Data Seeded Successfully! ');
    logger.info('==========================================');
    logger.info(' Login Credentials:');
    logger.info(`   Admin:      ${sampleData.admin.email} / ${sampleData.admin.password}`);
    logger.info(`   Salesman:   ${sampleData.salesman.email} / ${sampleData.salesman.password}`);
    logger.info(`   Accountant: ${sampleData.accountant.email} / ${sampleData.accountant.password}`);
    logger.info(`   Logistics:  ${sampleData.logistics.email} / ${sampleData.logistics.password}`);
    logger.info(`   Driver:     ${sampleData.driver.email} / ${sampleData.driver.password}`);
    logger.info('==========================================');

  } catch (error) {
    logger.error('Error seeding monolithic data:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await seedData();
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed data:', error);
    process.exit(1);
  }
};

main();

export default seedData;
