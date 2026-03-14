/**
 * Centralized user-facing error messages.
 * Single source of truth — avoid duplicating these strings across action files.
 *
 * Vietnamese diacritics required (Hard Boundary #13).
 */
export const MSG = {
  // Auth
  UNAUTHORIZED: "Bạn phải đăng nhập",
  NO_PERMISSION: "Bạn không có quyền truy cập chức năng này",
  NO_TENANT: "Tài khoản chưa được gán tenant",
  NO_BRANCH: "Bạn chưa được gán chi nhánh",
  NO_KDS_PERMISSION: "Bạn không có quyền truy cập KDS",

  // Profile / Entity
  PROFILE_NOT_FOUND: "Hồ sơ không tìm thấy",
  CUSTOMER_NOT_FOUND: "Không tìm thấy hồ sơ khách hàng",
  ENTITY_NOT_FOUND: "Dữ liệu không tồn tại hoặc không thuộc đơn vị của bạn",
  CUSTOMER_NOT_IN_TENANT: "Khách hàng không tồn tại hoặc không thuộc đơn vị của bạn",

  // Ownership
  NOT_YOUR_BRANCH: "Dữ liệu không thuộc chi nhánh của bạn",
  NOT_YOUR_TENANT: "Dữ liệu không thuộc tổ chức của bạn",

  // Validation
  INVALID_DATA: "Dữ liệu không hợp lệ",
  PHONE_EXISTS: "Số điện thoại đã tồn tại",
  SKU_EXISTS: "SKU đã tồn tại",
  INSUFFICIENT_POINTS: "Không đủ điểm để thực hiện giao dịch",

  // Dynamic messages
  ENTITY_NOT_FOUND_IN: (table: string) => `Không tìm thấy dữ liệu trong ${table}`,
} as const;
