// Shared KDS types — single source of truth for the KDS station UI

export interface TicketItemModifier {
  name: string;
  price?: number;
  options?: string[];
}

export interface TicketItem {
  order_item_id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  modifiers: TicketItemModifier[] | null;
  notes: string | null;
  variant_name: string | null;
}

export interface KdsTicket {
  id: number;
  order_id: number;
  station_id: number;
  status: string;
  items: unknown;
  priority: number | null;
  color_code: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

export interface TimingRule {
  category_id: number;
  prep_time_min: number;
  warning_min: number | null;
  critical_min: number | null;
}

export function parseItems(items: unknown): TicketItem[] {
  if (Array.isArray(items)) {
    return items as TicketItem[];
  }
  return [];
}
