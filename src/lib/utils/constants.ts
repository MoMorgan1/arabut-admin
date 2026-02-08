// === Order Status Labels ===

export const COINS_STATUS_LABELS: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipping: "Shipping",
  on_hold_internal: "On Hold — Internal",
  on_hold_customer: "On Hold — Customer",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  new: "New",
  credentials_sent: "Credentials Sent",
  in_progress: "In Progress",
  on_hold_customer: "On Hold — Customer",
  completed: "Completed",
  completed_comp: "Completed + Comp",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Unified status labels (works for both coins and service items)
export const STATUS_LABELS: Record<string, string> = {
  ...COINS_STATUS_LABELS,
  ...SERVICE_STATUS_LABELS,
};

// Status options for dropdowns (by type)
export const COINS_STATUSES = Object.keys(COINS_STATUS_LABELS);
export const SERVICE_STATUSES = Object.keys(SERVICE_STATUS_LABELS);

// === Status Badge Colors ===
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface StatusStyle {
  label: string;
  color: string;
  textColor: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  new: { label: "New", color: "bg-yellow-500/20", textColor: "text-yellow-400" },
  processing: { label: "Processing", color: "bg-yellow-500/20", textColor: "text-yellow-400" },
  shipping: { label: "Shipping", color: "bg-blue-500/20", textColor: "text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-blue-500/20", textColor: "text-blue-400" },
  credentials_sent: { label: "Credentials Sent", color: "bg-blue-500/20", textColor: "text-blue-400" },
  on_hold_internal: { label: "On Hold — Internal", color: "bg-orange-500/20", textColor: "text-orange-400" },
  on_hold_customer: { label: "On Hold — Customer", color: "bg-orange-500/20", textColor: "text-orange-400" },
  completed: { label: "Completed", color: "bg-green-500/20", textColor: "text-green-400" },
  completed_comp: { label: "Completed + Comp", color: "bg-green-500/20", textColor: "text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20", textColor: "text-red-400" },
  refunded: { label: "Refunded", color: "bg-red-500/20", textColor: "text-red-400" },
};

// === Order Type Labels ===
export const ORDER_TYPE_LABELS: Record<string, string> = {
  coins: "Coins",
  fut: "FUT",
  sbc: "SBC",
  rivales: "Rivales",
  other: "Other",
};

// === Account Check Notes (FUT Transfer) ===
export const ACCOUNT_CHECK_NOTES: Record<string, string> = {
  wrongBA: "Wrong backup codes — need new ones",
  wrongUserPass: "Wrong email or password",
  wrongConsole: "Wrong platform — check order type",
  noClub: "Account has no club",
  tlFull: "Transfer list is full — need 3 empty spots",
  notEnoughCoins: "Account must have more than 1,500 coins",
  console: "Must sign out from console",
  noTM: "Account has no transfer market",
  wrongPersona: "Need to change persona",
  captcha: "Need to solve captcha",
  unassignedItemsPresent: "Unassigned items present — must be less than 50",
  FailWebAppCustomerLocked: "Web app account is locked",
  finished: "Verified successfully",
};

// === Pricing Tiers (matches N8N) ===
export const PRICING = {
  usdToEurRate: 0.84,
  PS: {
    slow_AnyQty: 14,
    fast_Tier1: 16,
    fast_Tier2: 18,
    fast_Tier3: 22,
    fast_Tier4: 24,
    fast_Tier5: 26,
  },
  PC: {
    slow_AnyQty: 25,
    fast_Tier1: 25,
    fast_Tier2: 25,
    fast_Tier3: 25,
    fast_Tier4: 25,
    fast_Tier5: 25,
  },
} as const;
