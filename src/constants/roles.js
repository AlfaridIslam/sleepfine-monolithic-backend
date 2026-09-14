export const ROLES = {
  ADMIN: 'admin',
  SALESMAN: 'salesman', 
  LOGISTICS: 'logistics',
  ACCOUNTS: 'accounts',
  DRIVER: 'driver',
  MANAGER: 'manager'
};

export const PERMISSIONS = {
  // Order permissions
  CREATE_ORDER: 'create_order',
  VIEW_ORDER: 'view_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
  VIEW_OWN_ORDERS: 'view_own_orders',
  
  // User permissions
  CREATE_USER: 'create_user',
  VIEW_USER: 'view_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // Payment permissions
  UPDATE_PAYMENT: 'update_payment',
  VERIFY_PAYMENT: 'verify_payment',
  VIEW_PAYMENTS: 'view_payments',
  UPDATE_PAYMENTS: 'update_payments',
  VERIFY_PAYMENTS: 'verify_payments',
  VIEW_INVOICE: 'view_invoice',
  CREATE_INVOICE: 'create_invoice',
  
  // Logistics & Gatepass permissions
  CREATE_GATEPASS: 'create_gatepass',
  VIEW_GATEPASS: 'view_gatepass',
  UPDATE_GATEPASS: 'update_gatepass',
  ASSIGN_DRIVERS: 'assign_drivers',
  VIEW_DRIVERS: 'view_drivers',

  // Report permissions
  VIEW_SALES_REPORTS: 'view_sales_reports',
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',
  VIEW_ACCOUNTS_REPORTS: 'view_accounts_reports',
  
  // Notification permissions
  SEND_NOTIFICATIONS: 'send_notifications',
  VIEW_NOTIFICATIONS: 'view_notifications',
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  
  // Customer permissions
  CREATE_CUSTOMER: 'create_customer',
  VIEW_CUSTOMER: 'view_customer',
  UPDATE_CUSTOMER: 'update_customer',
  
  // Product permissions
  VIEW_PRODUCTS: 'view_products',
  VIEW_PRICING: 'view_pricing'
};

const accountsPermissions = [
  PERMISSIONS.VIEW_ORDER, PERMISSIONS.UPDATE_PAYMENT, PERMISSIONS.VERIFY_PAYMENT,
  PERMISSIONS.VIEW_PAYMENTS, PERMISSIONS.UPDATE_PAYMENTS, PERMISSIONS.VERIFY_PAYMENTS,
  PERMISSIONS.VIEW_INVOICE, PERMISSIONS.CREATE_INVOICE,
  PERMISSIONS.VIEW_FINANCIAL_REPORTS, PERMISSIONS.VIEW_ACCOUNTS_REPORTS
];

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  'super_admin': Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_ORDER, PERMISSIONS.VIEW_USER, PERMISSIONS.VIEW_CUSTOMER,
    PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.VIEW_PRICING, PERMISSIONS.VIEW_SALES_REPORTS
  ],
  [ROLES.SALESMAN]: [
    PERMISSIONS.CREATE_ORDER, PERMISSIONS.VIEW_ORDER, PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.CREATE_CUSTOMER, PERMISSIONS.VIEW_CUSTOMER, PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_PRICING, PERMISSIONS.SEND_NOTIFICATIONS, PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_SALES_REPORTS, PERMISSIONS.CREATE_INVOICE, PERMISSIONS.VIEW_INVOICE
  ],
  [ROLES.LOGISTICS]: [
    PERMISSIONS.VIEW_ORDER, PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.CREATE_GATEPASS, PERMISSIONS.VIEW_GATEPASS, PERMISSIONS.UPDATE_GATEPASS,
    PERMISSIONS.ASSIGN_DRIVERS, PERMISSIONS.VIEW_DRIVERS,
    PERMISSIONS.SEND_NOTIFICATIONS, PERMISSIONS.VIEW_NOTIFICATIONS
  ],
  [ROLES.ACCOUNTS]: accountsPermissions,
  'accountant': accountsPermissions,
  [ROLES.DRIVER]: [
    PERMISSIONS.VIEW_ORDER, PERMISSIONS.UPDATE_ORDER, PERMISSIONS.VIEW_GATEPASS
  ]
};

export const hasPermission = (role, permission) => {
  if (role === ROLES.ADMIN || role === 'super_admin') return true;
  const roleKey = role === 'accountant' ? ROLES.ACCOUNTS : role;
  const rolePerms = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
};

export const canAccessRole = (userRole, targetRole) => {
  if (userRole === ROLES.ADMIN) return true;
  return userRole === targetRole;
};

export default { ROLES, PERMISSIONS, ROLE_PERMISSIONS, hasPermission, canAccessRole };
