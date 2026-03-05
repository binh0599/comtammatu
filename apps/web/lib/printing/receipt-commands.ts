/**
 * Generate ESC/POS commands for a Cashier payment receipt.
 * Mirrors the layout of receipt-printer.tsx but in thermal print format.
 */

import { EscposBuilder } from "./escpos";

interface ReceiptOrderItem {
  quantity: number;
  unit_price: number;
  item_total: number;
  menu_items: { name: string } | null;
  menu_item_variants: { name: string } | null;
}

interface ReceiptOrderData {
  order_number: string;
  created_at: string;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  tables?: { number: number } | null;
  order_items: ReceiptOrderItem[];
  payments?: {
    amount: number;
    method: string;
  }[];
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
}

function fmtDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: "TIỀN MẶT",
  card: "THẺ",
  ewallet: "VÍ ĐIỆN TỬ",
  qr: "QR CODE",
};

export function generateReceiptCommands(
  order: ReceiptOrderData,
  cashierName = "Cashier",
  lineWidth = 42,
): Uint8Array {
  const b = new EscposBuilder();

  b.init();
  b.defaultLineSpacing();

  // ===== Header =====
  b.align("center");
  b.size(true, true);
  b.bold(true);
  b.textLn("CƠM TẤM MÁ TƯ");
  b.bold(false);
  b.size(false, false);
  b.textLn("123 Đường Số 1, Quận 1, TP. HCM");
  b.textLn("Hotline: 0909 123 456");
  b.lf();

  b.size(true, false);
  b.bold(true);
  b.textLn("PHIẾU THANH TOÁN");
  b.bold(false);
  b.size(false, false);

  b.align("left");
  b.separator();

  // ===== Order Info =====
  b.columns("Mã HĐ:", order.order_number, lineWidth);
  b.columns("Ngày:", fmtDateTime(order.created_at), lineWidth);
  b.columns("Thu ngân:", cashierName, lineWidth);
  b.columns(
    "Vị trí:",
    order.tables ? `Bàn ${order.tables.number}` : "Mang đi",
    lineWidth,
  );

  b.separator();

  // ===== Items =====
  for (const item of order.order_items) {
    const name = item.menu_items?.name ?? "?";
    const variant = item.menu_item_variants?.name;
    const label = variant ? `${name} (${variant})` : name;
    const qty = `x${item.quantity}`;
    const total = fmtPrice(item.item_total);

    // First line: name
    b.textLn(label);
    // Second line: qty + total (right-aligned)
    b.columns(`  ${qty}`, total, lineWidth);
  }

  b.separator();

  // ===== Totals =====
  b.columns("Tạm tính", fmtPrice(order.subtotal), lineWidth);

  if (order.discount_total > 0) {
    b.columns("Giảm giá", `-${fmtPrice(order.discount_total)}`, lineWidth);
  }

  if (order.tax > 0) {
    b.columns("Thuế VAT", fmtPrice(order.tax), lineWidth);
  }

  b.separator("=");
  b.size(true, false);
  b.bold(true);
  b.columns("TỔNG CỘNG", `${fmtPrice(order.total)}d`, lineWidth);
  b.bold(false);
  b.size(false, false);

  // ===== Payment =====
  const paymentAmount =
    order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  if (paymentAmount > 0) {
    b.separator();
    const method = order.payments?.[0]?.method ?? "cash";
    b.columns(
      `Khách đưa (${METHOD_LABELS[method] ?? method})`,
      fmtPrice(paymentAmount),
      lineWidth,
    );

    const change = paymentAmount > order.total ? paymentAmount - order.total : 0;
    b.bold(true);
    b.columns("Tiền thừa", fmtPrice(change), lineWidth);
    b.bold(false);
  }

  b.separator();

  // ===== Footer =====
  b.align("center");
  b.lf();
  b.bold(true);
  b.textLn("Cảm ơn và hẹn gặp lại!");
  b.bold(false);
  b.textLn("Pass WiFi: comtammatu");
  b.lf();

  b.cut();

  return b.build();
}
