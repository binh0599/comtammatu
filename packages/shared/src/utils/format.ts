/**
 * Format a VND price with thousands separator and ₫ symbol.
 * e.g. 45000 → "45.000₫"
 */
export function formatPrice(amount: number): string {
  return (
    new Intl.NumberFormat("vi-VN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + "₫"
  );
}

/**
 * Format elapsed time from a timestamp.
 * Returns e.g. "2 phút", "1 giờ 5 phút"
 */
export function formatElapsedTime(fromDate: string | Date): string {
  const from = typeof fromDate === "string" ? new Date(fromDate) : fromDate;
  const elapsed = Math.floor((Date.now() - from.getTime()) / 1000);

  if (elapsed < 60) return "Vừa xong";

  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainingMinutes} phút`;
}

/**
 * Format a date to Vietnamese locale string.
 * e.g. "28/02/2026 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a date to DD/MM/YYYY */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format time string "HH:mm:ss" → "HH:mm" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Format loyalty points with sign. e.g. +150, -50 */
export function formatPoints(points: number): string {
  const sign = points > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN").format(points)} điểm`;
}

/** Format discount display. e.g. "10%" or "50.000₫" */
export function formatDiscount(type: string, value: number): string {
  if (type === "percent") return `${value}%`;
  return formatPrice(value);
}

// =====================================================================
// Label Mappers — generated via createLabelMapper factory
// =====================================================================

/**
 * Factory: creates a label-mapper function from a key→label record.
 * Falls back to the raw key if no mapping exists.
 */
function createLabelMapper(
  labels: Record<string, string>,
): (key: string) => string {
  return (key: string) => labels[key] ?? key;
}

export const getOrderStatusLabel = createLabelMapper({
  draft: "Nháp",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng",
  served: "Đã phục vụ",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
});

export const getPaymentMethodLabel = createLabelMapper({
  cash: "Tiền mặt",
  card: "Thẻ",
  ewallet: "Ví điện tử",
  qr: "QR Code",
});

export const getTerminalTypeLabel = createLabelMapper({
  mobile_order: "Máy gọi món",
  cashier_station: "Máy thu ngân",
});

export const getTableStatusLabel = createLabelMapper({
  available: "Trống",
  occupied: "Có khách",
  reserved: "Đã đặt",
  maintenance: "Bảo trì",
});

export const getStockMovementTypeLabel = createLabelMapper({
  in: "Nhập kho",
  out: "Xuất kho",
  transfer: "Chuyển kho",
  waste: "Hao hụt",
  adjust: "Điều chỉnh",
});

export const getWasteReasonLabel = createLabelMapper({
  expired: "Hết hạn",
  spoiled: "Hỏng",
  overproduction: "Dư sản xuất",
  other: "Khác",
});

export const getPoStatusLabel = createLabelMapper({
  draft: "Nháp",
  sent: "Đã gửi",
  partially_received: "Nhận 1 phần",
  received: "Đã nhận",
  cancelled: "Đã hủy",
});

export const getPoQualityStatusLabel = createLabelMapper({
  pending: "Chờ kiểm tra",
  accepted: "Đạt",
  partial: "Đạt 1 phần",
  rejected: "Không đạt",
});

export const getStockCountStatusLabel = createLabelMapper({
  draft: "Nháp",
  submitted: "Đã nộp",
  approved: "Đã duyệt",
});

export const getEmploymentTypeLabel = createLabelMapper({
  full: "Toàn thời gian",
  part: "Bán thời gian",
  contract: "Hợp đồng",
});

export const getEmployeeStatusLabel = createLabelMapper({
  active: "Đang làm",
  inactive: "Nghỉ",
  on_leave: "Nghỉ phép",
  terminated: "Đã nghỉ",
});

export const getLeaveTypeLabel = createLabelMapper({
  annual: "Phép năm",
  sick: "Ốm",
  unpaid: "Không lương",
  maternity: "Thai sản",
});

export const getLeaveStatusLabel = createLabelMapper({
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
});

export const getSeverityLabel = createLabelMapper({
  info: "Thông tin",
  warning: "Cảnh báo",
  critical: "Nghiêm trọng",
});

export const getAttendanceStatusLabel = createLabelMapper({
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi muộn",
  early_leave: "Về sớm",
});

export const getShiftAssignmentStatusLabel = createLabelMapper({
  scheduled: "Đã lên lịch",
  confirmed: "Đã xác nhận",
  completed: "Hoàn tất",
  no_show: "Vắng mặt",
});

export const getCustomerGenderLabel = createLabelMapper({
  M: "Nam",
  F: "Nữ",
  Other: "Khác",
});

export const getCustomerSourceLabel = createLabelMapper({
  pos: "Tại quán",
  app: "Ứng dụng",
  website: "Website",
});

export const getLoyaltyTransactionTypeLabel = createLabelMapper({
  earn: "Tích điểm",
  redeem: "Đổi điểm",
  expire: "Hết hạn",
  adjust: "Điều chỉnh",
});

export const getVoucherTypeLabel = createLabelMapper({
  percent: "Giảm %",
  fixed: "Giảm cố định",
  free_item: "Tặng món",
});

export const getDeletionStatusLabel = createLabelMapper({
  pending: "Đang chờ",
  cancelled: "Đã hủy",
  completed: "Hoàn tất",
});

export const getPaymentStatusLabel = createLabelMapper({
  pending: "Chờ xử lý",
  completed: "Thành công",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
});

export const getOrderTypeLabel = createLabelMapper({
  dine_in: "Tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
});

export const getDiscountTypeLabel = createLabelMapper({
  percent: "Giảm %",
  fixed: "Giảm cố định",
  voucher: "Voucher",
});

// ===== Printing =====

export const getPrinterTypeLabel = createLabelMapper({
  thermal_usb: "Máy in USB",
  thermal_network: "Máy in mạng",
  browser: "In qua trình duyệt",
});

export const getPrinterTestStatusLabel = createLabelMapper({
  connected: "Đã kết nối",
  error: "Lỗi kết nối",
  untested: "Chưa kiểm tra",
});

export const getPrinterAssignedTypeLabel = createLabelMapper({
  pos_terminal: "Máy thu ngân",
  kds_station: "Trạm bếp",
});

// ===== 86'd / Menu Availability =====

export const getItemUnavailableReasonLabel = createLabelMapper({
  out_of_stock: "Hết hàng",
  ingredient_shortage: "Thiếu nguyên liệu",
  equipment_issue: "Lỗi thiết bị",
  seasonal: "Theo mùa",
  other: "Lý do khác",
});

// ===== Device Registration =====
export const getDeviceStatusLabel = createLabelMapper({
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
});
