export interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  item_total: number;
  status: string;
  notes: string | null;
  menu_items: { name: string } | null;
}

export interface Payment {
  id: number;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  branch_id: number;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount_total: number;
  total: number;
  notes: string | null;
  customer_id: number | null;
  table_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  branches: { id: number; name: string } | null;
  order_items: OrderItem[];
  payments: Payment[];
}

export interface Branch {
  id: number;
  name: string;
}
