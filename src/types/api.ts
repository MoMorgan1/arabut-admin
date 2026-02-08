// API types — Salla webhook payload & FUT Transfer responses

// === Salla Webhook ===

export interface SallaWebhookPayload {
  body: {
    id: number;
    reference_id: string;
    date: { date: string };
    status: { slug: string };
    payment_method: string;
    customer: {
      full_name: string;
      first_name: string;
      mobile: string;
      mobile_code: string;
    };
    amounts: {
      total: { amount: number };
    };
    exchange_rate: {
      rate: number;
    };
    items: SallaItem[];
  };
}

export interface SallaItem {
  sku: string;
  name: string;
  options: SallaItemOption[];
}

export interface SallaItemOption {
  name: string;
  value: string | { name: string; price: { amount: number } };
}

// === FUT Transfer API ===

export interface FTAvailableStockResponse {
  psTotal: number;
  pcTotal: number;
  [key: string]: unknown;
}

export interface FTOrderResponse {
  orderId: string;
  [key: string]: unknown;
}

export interface FTOrderStatusResponse {
  status: string;
  simplifiedStatus: string;
  accountCheck: string;
  accountCheckLong: string;
  economyState: string;
  economyStateLong: string;
  amountOrdered: number;
  /** Coins delivered so far (in K) — use this for delivery tracking */
  amount: number;
  coinsUsed: number;
  coinsCustomerAccount: number;
  toPay: number;
  sellerReceives: number;
  externalOrderID: string;
  wasAborted: 0 | 1;
  knownClub: string | null;
  cached: 0 | 1;
}

export interface FTBulkStatusResponse {
  [orderId: string]: FTOrderStatusResponse;
}
