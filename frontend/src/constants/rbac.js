/**
 * Hệ thống Phân quyền người dùng (Role-Based Access Control - RBAC)
 * Dùng cho cả Frontend check permission và kết nối Database/Backend (PostgreSQL / MongoDB / NestJS / Spring Boot)
 */


// Chức năng: Định nghĩa danh sách các vai trò (CUSTOMER, STAFF, ADMIN), 
// các quyền thao tác trong hệ thống và hàm kiểm tra xem tài khoản có quyền thực thi 
// một tính năng hay không.

export const USER_ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

export const PERMISSIONS = {
  // Khách hàng
  BOOK_PARKING: 'parking:book',
  VIEW_OWN_QR_PASS: 'qr:view_own',
  LINK_PAYMENT: 'payment:link',
  PAY_BARRIER: 'barrier:pay',
  REDEEM_VOUCHER: 'voucher:redeem',

  // Nhân viên bãi xe
  OVERRIDE_BARRIER: 'barrier:manual_override',
  VIEW_FLOOR_SENSORS: 'sensors:view_live',
  DISPATCH_RESCUE: 'rescue:dispatch',
  VERIFY_VEHICLE_PLATE: 'vehicle:verify_plate',

  // Quản lý chi nhánh
  VIEW_BRANCH_REVENUE: 'analytics:branch_revenue',
  SET_TARIFF_RATES: 'pricing:set_rates',
  MANAGE_BRANCH_SPOTS: 'spots:manage_capacity',
  APPROVE_PROMOTIONS: 'promos:approve',

  // Quản trị viên hệ thống
  MANAGE_USERS: 'users:manage_all',
  ASSIGN_ROLES: 'rbac:assign_roles',
  CONFIG_BARRIER_APIS: 'barrier:config_api',
  INTEGRATE_OCR_CAMERA: 'camera:ocr_config',
  DATABASE_BACKUP: 'system:database_backup'
};

export const ROLE_PERMISSIONS_MAP = {
  [USER_ROLES.CUSTOMER]: [
    PERMISSIONS.BOOK_PARKING,
    PERMISSIONS.VIEW_OWN_QR_PASS,
    PERMISSIONS.LINK_PAYMENT,
    PERMISSIONS.PAY_BARRIER,
    PERMISSIONS.REDEEM_VOUCHER
  ],
  [USER_ROLES.STAFF]: [
    PERMISSIONS.OVERRIDE_BARRIER,
    PERMISSIONS.VIEW_FLOOR_SENSORS,
    PERMISSIONS.DISPATCH_RESCUE,
    PERMISSIONS.VERIFY_VEHICLE_PLATE
  ],
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_BRANCH_REVENUE,
    PERMISSIONS.SET_TARIFF_RATES,
    PERMISSIONS.MANAGE_BRANCH_SPOTS,
    PERMISSIONS.APPROVE_PROMOTIONS,
    PERMISSIONS.OVERRIDE_BARRIER
  ],
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS)
};

export function hasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS_MAP[role] || [];
  return allowed.includes(permission);
}
