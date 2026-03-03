export interface QueueOrder {
  id: number;
  order_number: string;
  status: string;
  type: string;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  created_at: string;
  table_id: number | null;
  tables: { number: number } | null;
  order_items: {
    id: number;
    quantity: number;
    unit_price: number;
    item_total: number;
    menu_items: { name: string } | null;
    menu_item_variants: { name: string } | null;
    modifiers?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }[];
  order_discounts: {
    id: number;
    type: string;
    value: number;
    voucher_id: number | null;
    vouchers: { code: string } | null;
  }[];
}

export interface SessionInfo {
  id: number;
  opening_amount: number;
  opened_at: string;
  cashier_name: string;
  terminal_name: string;
}
