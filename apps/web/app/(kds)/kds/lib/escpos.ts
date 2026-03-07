/**
 * ESC/POS Functional Command Library for thermal receipt printers.
 *
 * Provides pure functions that generate ESC/POS byte sequences.
 * Used by Web Serial API integration for kitchen printing.
 *
 * Reference: ESC/POS Application Programming Guide
 * https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/
 */

// ===== ESC/POS Constants =====

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ===== Helpers =====

/**
 * Compute the printed display width of a string for monospaced thermal printers.
 * Normalizes to NFC to collapse combining marks (e.g., Vietnamese diacritics)
 * into precomposed characters, then counts Unicode code points.
 */
function getDisplayWidth(str: string): number {
  return [...str.normalize("NFC")].length;
}

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function concat(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

// ===== Low-level command functions =====

/** Initialize printer -- ESC @ + select UTF-8 charset (FS C 0 0 48 for multilingual UTF-8 mode) */
export function escposInit(): Uint8Array {
  return concat(
    bytes(ESC, 0x40),       // ESC @ — hardware reset
    bytes(0x1c, 0x43, 0x00, 0x00, 48), // FS C 0 0 48 — UTF-8 multilingual mode
  );
}

/** Paper cut (full cut) -- GS V 0 */
export function escposCut(): Uint8Array {
  return concat(bytes(LF, LF, LF), bytes(GS, 0x56, 0));
}

/** Toggle bold -- ESC E n */
export function escposBold(on: boolean): Uint8Array {
  return bytes(ESC, 0x45, on ? 1 : 0);
}

/** Center alignment -- ESC a 1 */
export function escposAlignCenter(): Uint8Array {
  return bytes(ESC, 0x61, 1);
}

/** Left alignment -- ESC a 0 */
export function escposAlignLeft(): Uint8Array {
  return bytes(ESC, 0x61, 0);
}

/** Toggle double height -- ESC ! n */
export function escposDoubleHeight(on: boolean): Uint8Array {
  return bytes(ESC, 0x21, on ? 0x10 : 0x00);
}

/** Feed n lines */
export function escposFeedLines(n: number): Uint8Array {
  const feeds: number[] = [];
  for (let i = 0; i < n; i++) {
    feeds.push(LF);
  }
  return new Uint8Array(feeds);
}

/** Encode text as NFC-normalized UTF-8 bytes for ESC/POS printers */
export function escposText(text: string): Uint8Array {
  return new TextEncoder().encode(text.normalize("NFC"));
}

/** Print a dashed separator line */
export function escposLine(charPerLine: number): Uint8Array {
  return new TextEncoder().encode("-".repeat(charPerLine) + "\n");
}

/** Toggle underline -- ESC - n */
export function escposUnderline(on: boolean): Uint8Array {
  return bytes(ESC, 0x2d, on ? 1 : 0);
}

/** Right alignment -- ESC a 2 */
export function escposAlignRight(): Uint8Array {
  return bytes(ESC, 0x61, 2);
}

/** Double width + double height -- ESC ! n */
export function escposDoubleSize(on: boolean): Uint8Array {
  return bytes(ESC, 0x21, on ? 0x30 : 0x00);
}

/** Text + line feed */
export function escposTextLn(text: string): Uint8Array {
  return concat(escposText(text), bytes(LF));
}

/**
 * Two-column line: left-aligned text + right-aligned text,
 * padded with spaces to fill lineWidth.
 */
function escposColumns(left: string, right: string, lineWidth: number): Uint8Array {
  const spaces = Math.max(1, lineWidth - getDisplayWidth(left) - getDisplayWidth(right));
  return escposTextLn(left + " ".repeat(spaces) + right);
}

// ===== High-level templates =====

function fmtDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  });
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
}

/**
 * Build ESC/POS byte commands for a KDS kitchen ticket.
 */
export function buildKdsTicket(ticket: {
  stationName: string;
  orderNumber: string;
  tableNumber: string | null;
  items: Array<{
    quantity: number;
    name: string;
    notes?: string;
    modifiers?: Array<{ name: string; options?: string[] }> | null;
  }>;
  notes?: string;
  createdAt: string;
  paperWidth: number; // 58 or 80
}): Uint8Array {
  const lineWidth = ticket.paperWidth === 58 ? 32 : 42;
  const parts: Uint8Array[] = [];

  // Initialize
  parts.push(escposInit());

  // Header: station name (bold, centered)
  parts.push(escposAlignCenter());
  parts.push(escposBold(true));
  parts.push(escposTextLn(ticket.stationName));
  parts.push(escposBold(false));

  // Order number (double height, centered)
  parts.push(escposDoubleHeight(true));
  parts.push(escposTextLn(`Don #${ticket.orderNumber}`));
  parts.push(escposDoubleHeight(false));

  // Table
  parts.push(escposAlignLeft());
  parts.push(escposTextLn(
    ticket.tableNumber ? `Ban: ${ticket.tableNumber}` : "Mang ve",
  ));

  // Separator
  parts.push(escposLine(lineWidth));

  // Items
  for (const item of ticket.items) {
    parts.push(escposBold(true));
    parts.push(escposTextLn(`${item.quantity}x  ${item.name}`));
    parts.push(escposBold(false));

    if (item.modifiers?.length) {
      for (const mod of item.modifiers) {
        const detail = mod.options?.length ? `: ${mod.options.join(", ")}` : "";
        parts.push(escposTextLn(`    + ${mod.name}${detail}`));
      }
    }

    if (item.notes) {
      parts.push(escposTextLn(`    * ${item.notes}`));
    }
  }

  // Separator
  parts.push(escposLine(lineWidth));

  // Notes
  if (ticket.notes) {
    parts.push(escposTextLn(`Ghi chu: ${ticket.notes}`));
  }

  // Time
  parts.push(escposTextLn(`Luc: ${fmtDateTime(ticket.createdAt)}`));

  // Cut
  parts.push(escposCut());

  return concat(...parts);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "TIEN MAT",
  card: "THE",
  ewallet: "VI DIEN TU",
  qr: "QR CODE",
};

/**
 * Build ESC/POS byte commands for a POS payment receipt.
 */
export function buildPosReceipt(receipt: {
  storeName: string;
  branchName: string;
  orderNumber: string;
  tableNumber: string | null;
  items: Array<{ quantity: number; name: string; price: number; total: number }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  createdAt: string;
  paperWidth: number;
  wifiPassword?: string;
}): Uint8Array {
  const lineWidth = receipt.paperWidth === 58 ? 32 : 42;
  const parts: Uint8Array[] = [];

  // Initialize
  parts.push(escposInit());

  // Header
  parts.push(escposAlignCenter());
  parts.push(escposDoubleSize(true));
  parts.push(escposBold(true));
  parts.push(escposTextLn(receipt.storeName));
  parts.push(escposBold(false));
  parts.push(escposDoubleSize(false));
  parts.push(escposTextLn(receipt.branchName));
  parts.push(escposFeedLines(1));

  parts.push(escposBold(true));
  parts.push(escposTextLn("PHIEU THANH TOAN"));
  parts.push(escposBold(false));

  parts.push(escposAlignLeft());
  parts.push(escposLine(lineWidth));

  // Order info
  parts.push(escposColumns("Ma HD:", receipt.orderNumber, lineWidth));
  parts.push(escposColumns("Ngay:", fmtDateTime(receipt.createdAt), lineWidth));
  parts.push(escposColumns("Thu ngan:", receipt.cashierName, lineWidth));
  parts.push(escposColumns(
    "Vi tri:",
    receipt.tableNumber ? `Ban ${receipt.tableNumber}` : "Mang di",
    lineWidth,
  ));

  parts.push(escposLine(lineWidth));

  // Items
  for (const item of receipt.items) {
    parts.push(escposTextLn(item.name));
    parts.push(escposColumns(
      `  x${item.quantity}`,
      fmtPrice(item.total),
      lineWidth,
    ));
  }

  parts.push(escposLine(lineWidth));

  // Totals
  parts.push(escposColumns("Tam tinh", fmtPrice(receipt.subtotal), lineWidth));

  if (receipt.tax > 0) {
    parts.push(escposColumns("Thue VAT", fmtPrice(receipt.tax), lineWidth));
  }

  if (receipt.serviceCharge > 0) {
    parts.push(escposColumns("Phi dich vu", fmtPrice(receipt.serviceCharge), lineWidth));
  }

  // Total (bold, double width)
  parts.push(escposTextLn("=".repeat(lineWidth)));
  parts.push(escposBold(true));
  parts.push(escposDoubleHeight(true));
  parts.push(escposColumns("TONG CONG", `${fmtPrice(receipt.total)}d`, lineWidth));
  parts.push(escposDoubleHeight(false));
  parts.push(escposBold(false));

  // Payment method
  parts.push(escposLine(lineWidth));
  const methodLabel = PAYMENT_METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod.toUpperCase();
  parts.push(escposColumns("Thanh toan:", methodLabel, lineWidth));

  // Footer
  parts.push(escposFeedLines(1));
  parts.push(escposAlignCenter());
  parts.push(escposBold(true));
  parts.push(escposTextLn("Cam on va hen gap lai!"));
  parts.push(escposBold(false));
  if (receipt.wifiPassword) {
    parts.push(escposTextLn(`Pass WiFi: ${receipt.wifiPassword}`));
  }
  parts.push(escposFeedLines(1));

  // Cut
  parts.push(escposCut());

  return concat(...parts);
}
