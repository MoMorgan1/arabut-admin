// Database types — mirrors supabase-schema.sql
// In production, generate with: npx supabase gen types typescript

export type OrderType = "coins" | "fut_rank" | "challenges" | "raffles" | "other";
export type Platform = "PS" | "PC";
export type ShippingType = "fast" | "slow";
export type FulfillmentMethod = "internal" | "external";
export type UserRole = "admin" | "employee" | "supplier";

// === Coins order statuses ===
export type CoinsStatus =
  | "new"
  | "processing"
  | "shipping"
  | "on_hold_internal"
  | "on_hold_customer"
  | "completed"
  | "cancelled"
  | "refunded";

// === Service order statuses ===
export type ServiceStatus =
  | "new"
  | "credentials_sent"
  | "in_progress"
  | "on_hold_customer"
  | "completed"
  | "completed_comp"
  | "cancelled"
  | "refunded";

export type OrderItemStatus = CoinsStatus | ServiceStatus;

// === Table row types ===

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string | null;
  name: string;
  contact_info: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  salla_order_id: string;
  salla_reference_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_phone_code: string;
  payment_method: string | null;
  salla_total_sar: number | null;
  exchange_rate: number | null;
  status: string;
  order_date: string;
  notes: string | null;
  settled_amount: number | null;
  raw_webhook: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_type: OrderType;
  product_name: string;
  sku: string | null;
  status: string;

  // EA Credentials
  ea_email: string | null;
  ea_password: string | null;
  backup_code_1: string | null;
  backup_code_2: string | null;
  backup_code_3: string | null;
  platform: Platform | null;

  // Coins specific
  coins_amount_k: number | null;
  shipping_type: ShippingType | null;
  max_price_eur: number | null;
  top_up_enabled: number | null;
  fulfillment_method: FulfillmentMethod | null;

  // FUT Transfer
  ft_order_id: string | null;
  ft_status: string | null;
  ft_last_synced: string | null;

  // Cost
  expected_cost: number | null;
  actual_cost: number | null;

  // Supplier
  supplier_id: string | null;

  // Notes
  notes: string | null;
  customer_note: string | null;

  created_at: string;
  updated_at: string;
}

export interface OrderStatusLog {
  id: string;
  order_item_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
  type: "deposit" | "deduction" | "refund" | "adjustment";
  amount: number;
  balance_after: number;
  order_item_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  is_recurring: boolean;
  recurring_months: number;
  monthly_share: number | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
}

export interface RevenueSettlement {
  id: string;
  file_name: string;
  upload_date: string;
  total_amount: number | null;
  matched_count: number;
  unmatched_count: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  salla_order_id: string;
  settled_amount: number;
  is_matched: boolean;
  order_id: string | null;
  created_at: string;
}

export interface PricingRule {
  id: string;
  platform: Platform;
  shipping_type: ShippingType;
  min_amount_k: number;
  max_amount_k: number | null;
  price_per_million_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// === Joined / View types ===

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}
