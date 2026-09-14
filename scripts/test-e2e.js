import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import adminService from '../src/modules/admin/services/adminService.js';

const PORT = 5998;
const BASE_URL = `http://localhost:${PORT}`;

const runTests = async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  const record = (name, ok, details = '') => {
    if (ok) {
      passed++;
      console.log(`  ✓ [PASS] ${name} ${details ? `(${details})` : ''}`);
      results.push({ name, status: 'PASS', details });
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      results.push({ name, status: 'FAIL', details });
    }
  };

  const req = async (urlPath, options = {}) => {
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, ok: res.ok, body };
  };

  console.log('\n======================================================');
  console.log(' Starting End-to-End Monolithic Backend Verification ');
  console.log('======================================================\n');

  // Connect to DB
  await connectDB();

  // Start HTTP Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening at ${BASE_URL}\n`);

  try {
    // ----------------------------------------------------
    // Section 1: Health & Root Discovery
    // ----------------------------------------------------
    console.log('--- 1. Health & Discovery Endpoints ---');
    {
      const r = await req('/health');
      record('Root Health Check', r.status === 200, `status: ${r.status}`);
    }
    {
      const r = await req('/api/v1');
      record('API v1 Discovery Root', r.status === 200, `status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/sales/health');
      record('Sales Module Health', r.status === 200, `status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/accounts/health');
      record('Accounts Module Health', r.status === 200, `status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/logistics/health');
      record('Logistics Module Health', r.status === 200, `status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/notifications/health');
      record('Notifications Module Health', r.status === 200, `status: ${r.status}`);
    }

    // ----------------------------------------------------
    // Section 2: Authentication & RBAC Login
    // ----------------------------------------------------
    console.log('\n--- 2. Multi-Role Authentication ---');
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({})
      });
      record('Auth Validation: Empty Body rejected', r.status === 400, `Expected 400, got ${r.status}`);
    }
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@sleepfine.com', password: 'password123' })
      });
      record('Auth Validation: Missing userType rejected', r.status === 400, `Expected 400, got ${r.status}`);
    }
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@sleepfine.com', password: 'password123', userType: 'superman' })
      });
      record('Auth Validation: Invalid userType rejected', r.status === 400, `Expected 400, got ${r.status}`);
    }
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@sleepfine.com', password: 'WrongPassword', userType: 'admin' })
      });
      record('Auth Security: Wrong Password returns generic Invalid credentials', r.status === 401 && r.body?.message === 'Invalid credentials', `Expected 401 & "Invalid credentials", got ${r.status}: "${r.body?.message}"`);
    }
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@sleepfine.com', password: 'password123', userType: 'admin' })
      });
      record('Auth Security: Non-existent email returns generic Invalid credentials', r.status === 401 && r.body?.message === 'Invalid credentials', `Expected 401 & "Invalid credentials", got ${r.status}: "${r.body?.message}"`);
    }

    let adminToken = '';
    let salesmanToken = '';
    let accountantToken = '';
    let logisticsToken = '';
    let driverToken = '';

    // Admin Login
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@sleepfine.com', password: 'password123', userType: 'admin' })
      });
      adminToken = r.body?.data?.token;
      record('Admin Login (Direct O(1) Lookup)', r.status === 200 && !!adminToken, `User: ${r.body?.data?.user?.email}`);
    }

    // Salesman Login
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'john@salesman.com', password: 'password123', userType: 'salesman' })
      });
      salesmanToken = r.body?.data?.token;
      record('Salesman Login (Direct O(1) Lookup)', r.status === 200 && !!salesmanToken, `User: ${r.body?.data?.user?.email}`);
    }

    // Accountant Login
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'jane@accountant.com', password: 'password123', userType: 'accountant' })
      });
      accountantToken = r.body?.data?.token;
      record('Accountant Login (Direct O(1) Lookup)', r.status === 200 && !!accountantToken, `User: ${r.body?.data?.user?.email}`);
    }

    // Logistics Login
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'mike@logistics.com', password: 'password123', userType: 'logistics' })
      });
      logisticsToken = r.body?.data?.token;
      record('Logistics Login (Direct O(1) Lookup)', r.status === 200 && !!logisticsToken, `User: ${r.body?.data?.user?.email}`);
    }

    // Driver Login
    {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'driver@sleepfine.com', password: 'password123', userType: 'driver' })
      });
      driverToken = r.body?.data?.token;
      record('Driver Login (Direct O(1) Lookup)', r.status === 200 && !!driverToken, `User: ${r.body?.data?.user?.email}`);
    }

    // Current user check (/me)
    {
      const r = await req('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Protected Route /api/v1/auth/me', r.status === 200 && r.body?.data?.user?.email === 'admin@sleepfine.com');
    }

    // ----------------------------------------------------
    // Section 3: Security & Authorization Barriers (RBAC)
    // ----------------------------------------------------
    console.log('\n--- 3. RBAC & Security Isolation ---');
    {
      const r = await req('/api/v1/admin/dashboard');
      record('RBAC: Anonymous access to /admin/dashboard rejected', r.status === 401, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${salesmanToken}` }
      });
      record('RBAC: Salesman access to /admin/dashboard forbidden', r.status === 403, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/admin/settings', {
        headers: { Authorization: `Bearer ${logisticsToken}` }
      });
      record('RBAC: Logistics access to /admin/settings forbidden', r.status === 403, `Status: ${r.status}`);
    }

    // ----------------------------------------------------
    // Section 4: Admin Service
    // ----------------------------------------------------
    console.log('\n--- 4. Admin Module Endpoints ---');
    {
      const r = await req('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Admin Dashboard API', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Admin Users List API', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Admin Audit Logs API', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/admin/settings', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Admin System Settings API', r.status === 200, `Status: ${r.status}`);
    }
    {
      const testAudit = await adminService.createAuditLog({
        action: 'Service Layer Audit Verification',
        actionType: 'delete',
        resource: 'user_account',
        service: 'admin',
        userId: new mongoose.Types.ObjectId('6a9fc871aa0ad0ec6422cea6'),
        userModel: 'Admin',
        userDetails: {
          name: 'Admin Test',
          email: 'admin@sleepfine.com',
          role: 'super_admin'
        },
        category: 'security'
      });
      const validAudit = testAudit && testAudit.logId?.startsWith('LOG') && testAudit.retentionDate && testAudit.severity === 'critical';
      record('Admin Service createAuditLog (Computed logId, retentionDate, severity)', !!validAudit, `LogId: ${testAudit?.logId}, Severity: ${testAudit?.severity}`);
    }

    // ----------------------------------------------------
    // Section 5: Sales Service
    // ----------------------------------------------------
    console.log('\n--- 5. Sales Module Endpoints ---');
    {
      const r = await req('/api/v1/sales/orders', {
        headers: { Authorization: `Bearer ${salesmanToken}` }
      });
      record('Sales Orders List (Salesman)', r.status === 200, `Orders found: ${r.body?.data?.orders?.length || r.body?.data?.length || 0}`);
    }
    {
      const r = await req('/api/v1/sales/salesmen', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Salesmen Directory (Admin)', r.status === 200, `Status: ${r.status}`);
    }

    // ----------------------------------------------------
    // Section 6: Accounts Service
    // ----------------------------------------------------
    console.log('\n--- 6. Accounts Module Endpoints ---');
    {
      const r = await req('/api/v1/accounts/payments', {
        headers: { Authorization: `Bearer ${accountantToken}` }
      });
      record('Accounts Payments List', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/accounts/invoices', {
        headers: { Authorization: `Bearer ${accountantToken}` }
      });
      record('Accounts Invoices List', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/accounts/dashboard', {
        headers: { Authorization: `Bearer ${accountantToken}` }
      });
      record('Accounts Dashboard Overview', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/accounts/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accountantToken}` },
        body: JSON.stringify({
          orderId: 'ORD_TEST_999',
          invoiceType: 'tax_invoice',
          customer: {
            name: 'Test Customer',
            email: 'test@customer.com',
            phone: '9876543210'
          },
          items: [
            {
              name: 'SleepFine Luxury Mattress',
              quantity: 2,
              rate: 10000,
              discount: 10,
              discountType: 'percentage',
              cgstRate: 9,
              sgstRate: 9
            }
          ],
          paymentTerms: {
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
      const inv = r.body?.data;
      const calcOk = inv && inv.financialDetails?.taxableAmount === 18000 && inv.financialDetails?.grandTotal === 21240 && inv.invoiceNumber?.startsWith('INV');
      record('Accounts Create Invoice (Service-Calculated GST & Totals)', r.status === 201 && calcOk, `Invoice: ${inv?.invoiceNumber}, GrandTotal: ${inv?.financialDetails?.grandTotal}, Taxable: ${inv?.financialDetails?.taxableAmount}`);
    }

    // ----------------------------------------------------
    // Section 7: Logistics Service
    // ----------------------------------------------------
    console.log('\n--- 7. Logistics Module Endpoints ---');
    {
      const r = await req('/api/v1/logistics/gatepasses', {
        headers: { Authorization: `Bearer ${logisticsToken}` }
      });
      record('Logistics Gatepasses List', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/logistics/drivers', {
        headers: { Authorization: `Bearer ${logisticsToken}` }
      });
      record('Logistics Drivers List', r.status === 200, `Status: ${r.status}`);
    }

    // ----------------------------------------------------
    // Section 8: Notifications Service
    // ----------------------------------------------------
    console.log('\n--- 8. Notifications Module Endpoints ---');
    {
      record('No Fake System Model Registered', mongoose.models.System === undefined);
    }
    {
      const r = await req('/api/v1/notifications/notifications', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Notifications List', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/notifications/templates', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record('Notification Templates List', r.status === 200, `Status: ${r.status}`);
    }
    {
      const r = await req('/api/v1/notifications/broadcast', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          title: 'System Maintenance Window',
          message: 'Scheduled database optimization tonight at midnight',
          priority: 'medium',
          targetRoles: ['salesman', 'logistics']
        })
      });
      const notif = r.body?.data?.notification;
      const isSystem = notif && notif.isSystemGenerated === true && (!notif.createdBy || notif.createdBy === null);
      record('System Broadcast Notification (isSystemGenerated: true, createdBy: null)', r.status === 200 && isSystem, `Status: ${r.status}, isSystemGenerated: ${notif?.isSystemGenerated}`);
    }
    {
      const r = await req('/api/v1/notifications/notifications?isSystemGenerated=true', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const items = r.body?.data?.notifications || [];
      const allSystem = items.length > 0 && items.every(n => n.isSystemGenerated === true);
      record('Query System Notifications (isSystemGenerated filter & populates cleanly)', r.status === 200 && allSystem, `Found: ${items.length}`);
    }

    // ----------------------------------------------------
    // Section 9: End-to-End Operational Lifecycle
    // ----------------------------------------------------
    console.log('\n--- 9. Full Operational Lifecycle Workflow ---');
    let createdOrderId = '';
    let createdOrderRef = '';
    
    // Step 9.1: Salesman creates Order
    {
      const r = await req('/api/v1/sales/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${salesmanToken}` },
        body: JSON.stringify({
          customer: {
            name: 'Priya Sharma',
            phone: '9876543210',
            email: 'priya@example.com',
            address: {
              street: '45 Lake View Residency',
              city: 'Bengaluru',
              state: 'Karnataka',
              zipCode: '560001'
            }
          },
          items: [
            {
              productName: 'SleepFine Royal Orthopedic Pocket Spring Mattress',
              quantity: 1,
              unitPrice: 25000,
              totalPrice: 25000,
              description: 'King Size 78x72 inches with Memory Foam Top'
            }
          ],
          orderDetails: {
            totalAmount: 25000,
            advanceAmount: 5000,
            pendingAmount: 20000,
            notes: 'Delivery requested on weekend'
          },
          deliveryAddress: {
            street: '45 Lake View Residency',
            city: 'Bengaluru',
            state: 'Karnataka',
            zipCode: '560001'
          }
        })
      });
      createdOrderId = r.body?.data?._id;
      createdOrderRef = r.body?.data?.orderId;
      record('Lifecycle: Salesman creates new Order', r.status === 201 && !!createdOrderId, `Order Ref: ${createdOrderRef}`);
    }

    // Step 9.2: Fetch newly created Order
    if (createdOrderId) {
      const r = await req(`/api/v1/sales/orders/${createdOrderId}`, {
        headers: { Authorization: `Bearer ${salesmanToken}` }
      });
      record('Lifecycle: Fetch order details by ID', r.status === 200 && r.body?.data?.orderId === createdOrderRef, `Status: ${r.status}`);
    }

    // Step 9.3: Create Gatepass for Order (Logistics)
    let createdGatepassId = '';
    if (createdOrderId) {
      const r = await req('/api/v1/logistics/gatepasses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${logisticsToken}` },
        body: JSON.stringify({
          orderId: createdOrderRef,
          order: createdOrderId,
          driverId: '6a9fc871aa0ad0ec6422ceb3',
          vehicleNumber: 'KA-01-AB-1234',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productName: 'SleepFine Royal Orthopedic Pocket Spring Mattress',
              quantity: 1
            }
          ],
          deliveryDetails: {
            destination: 'Bengaluru Central',
            recipientName: 'Priya Sharma',
            recipientPhone: '9876543210',
            address: {
              street: '45 Lake View Residency',
              city: 'Bengaluru',
              state: 'Karnataka',
              zipCode: '560001'
            }
          },
          notes: 'Express dispatch gatepass'
        })
      });
      createdGatepassId = r.body?.data?._id;
      record('Lifecycle: Logistics issues Gatepass for Order', r.status === 201 && !!createdGatepassId, `Gatepass ID: ${r.body?.data?.gatepassId}`);
    }

    // Step 9.4: System / Admin Notification
    {
      const r = await req('/api/v1/notifications/notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          title: 'Order Dispatched Successfully',
          message: `Order ${createdOrderRef || 'ORD001'} is packaged and ready for delivery.`,
          type: 'order_update',
          priority: 'high',
          channels: ['in_app', 'email'],
          recipients: [
            {
              userId: '6a9fc871aa0ad0ec6422ceab',
              userModel: 'Salesman',
              role: 'salesman'
            }
          ]
        })
      });
      record('Lifecycle: Trigger Order Notification', r.status === 201, `Status: ${r.status}`);
    }

  } finally {
    // Teardown
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
    console.log('\n======================================================');
    console.log(` Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests `);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
