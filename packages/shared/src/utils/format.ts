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

/**
 * Get display label for order status (Vietnamese).
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Nháp",
    confirmed: "Đã xác nhận",
    preparing: "Đang chuẩn bị",
    ready: "Sẵn sàng",
    served: "Đã phục vụ",
    completed: "Hoàn tất",
    cancelled: "Đã huỷ",
  };
  return labels[status] ?? status;
}

/**
 * Get display label for payment method (Vietnamese).
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Tiền mặt",
    card: "Thẻ",
    ewallet: "Ví điện tử",
    qr: "QR Code",
  };
  return labels[method] ?? method;
}

/**
 * Get display label for terminal type (Vietnamese).
 */
export function getTerminalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mobile_order: "Máy gọi món",
    cashier_station: "Máy thu ngân",
  };
  return labels[type] ?? type;
}

/**
 * Get display label for table status (Vietnamese).
 */
export function getTableStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Trống",
    occupied: "Có khách",
    reserved: "Đã đặt",
    maintenance: "Bảo trì",
  };
  return labels[status] ?? status;
}
