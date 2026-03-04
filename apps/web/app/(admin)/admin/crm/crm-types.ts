export interface LoyaltyTier {
  id: number;
  name: string;
  min_points: number;
  discount_pct: number | null;
}

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birthday: string | null;
  source: string | null;
  loyalty_tier_id: number | null;
  total_spent: number;
  total_visits: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  loyalty_tiers: { name: string } | null;
}

export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  points: number;
  type: string;
  balance_after: number | null;
  reference_type: string | null;
  created_at: string;
}
