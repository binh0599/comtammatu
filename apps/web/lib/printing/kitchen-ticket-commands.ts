/**
 * Generate ESC/POS commands for a KDS kitchen ticket.
 * Large font for order number + table, clear item list with notes.
 */

import { EscposBuilder } from "./escpos";

interface TicketItemModifier {
  name: string;
  price?: number;
  options?: string[];
}

interface KdsTicketItem {
  menu_item_name: string;
  quantity: number;
  variant_name: string | null;
  modifiers: TicketItemModifier[] | null;
  notes: string | null;
}

interface KdsTicketData {
  id: number;
  order_id: number;
  items: unknown;
  created_at: string;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

function parseItems(items: unknown): KdsTicketItem[] {
  if (Array.isArray(items)) return items as KdsTicketItem[];
  return [];
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

export function generateKitchenTicketCommands(
  ticket: KdsTicketData,
  stationName?: string,
  lineWidth = 42,
): Uint8Array {
  const b = new EscposBuilder();
  const items = parseItems(ticket.items);
  const orderNumber = ticket.orders?.order_number ?? `#${ticket.order_id}`;
  const tableNumber = ticket.orders?.tables?.number;

  b.init();
  b.defaultLineSpacing();

  // ===== Header =====
  b.align("center");
  b.size(true, true);
  b.bold(true);
  b.textLn("DON BEP");
  b.size(false, false);
  b.bold(false);
  if (stationName) {
    b.textLn(stationName);
  }

  b.separator("=");

  // ===== Order Info =====
  b.align("left");
  b.columns("Ma don:", orderNumber, lineWidth);

  if (tableNumber != null) {
    // Table number printed large for visibility
    b.bold(true);
    b.size(true, true);
    b.align("center");
    b.textLn(`BAN ${tableNumber}`);
    b.size(false, false);
    b.bold(false);
    b.align("left");
  }

  b.columns("Luc:", fmtDateTime(ticket.created_at), lineWidth);

  b.separator();

  // ===== Items =====
  for (const item of items) {
    // Main item: bold, slightly larger
    b.bold(true);
    const variant = item.variant_name ? ` - ${item.variant_name}` : "";
    b.textLn(`${item.quantity}x ${item.menu_item_name}${variant}`);
    b.bold(false);

    // Modifiers
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        const opts = mod.options ? `: ${mod.options.join(", ")}` : "";
        b.textLn(`   + ${mod.name}${opts}`);
      }
    }

    // Special notes — emphasized
    if (item.notes) {
      b.bold(true);
      b.underline(true);
      b.textLn(`   * ${item.notes}`);
      b.underline(false);
      b.bold(false);
    }
  }

  b.separator();

  // ===== Footer =====
  b.align("center");
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  b.textLn(`Tong: ${totalQty} mon`);
  b.lf();

  b.cut();

  return b.build();
}
