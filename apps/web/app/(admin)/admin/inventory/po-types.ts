export interface Supplier {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

export interface PoItem {
  id: number;
  ingredient_id: number;
  quantity: number;
  unit_price: number;
  received_qty: number;
  reject_qty: number;
  reject_reason: string | null;
  quality_status: string;
  ingredients: { name: string; unit: string } | null;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  branch_id: number;
  status: string;
  total: number | null;
  notes: string | null;
  expected_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  suppliers: { name: string } | null;
  branches: { name: string } | null;
  purchase_order_items: PoItem[];
}

export interface NewItem {
  ingredient_id: string;
  quantity: string;
  unit_price: string;
}

export interface CreatePoData {
  supplier_id: number;
  branch_id: number;
  expected_at?: string;
  notes?: string;
  items: { ingredient_id: number; quantity: number; unit_price: number }[];
}

export interface ReceivePoData {
  po_id: number;
  items: {
    po_item_id: number;
    received_qty: number;
    reject_qty: number;
    reject_reason: string;
    quality_status: "accepted" | "partial" | "rejected";
    expiry_date: string;
  }[];
}

export function getStatusBadgeVariant(
  status: string,
): "secondary" | "outline" | "default" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "sent":
      return "outline";
    case "partially_received":
      return "outline";
    case "received":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}
