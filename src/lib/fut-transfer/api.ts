import type { Platform } from "@/types/database";
import type {
  FTAvailableStockResponse,
  FTOrderResponse,
  FTOrderStatusResponse,
  FTBulkStatusResponse,
} from "@/types/api";
import { createAdminClient } from "@/lib/supabase/admin";

const FT_BASE_URL = "https://futtransfer.top";

function getCredentials() {
  return {
    apiUser: process.env.FT_API_USER!,
    apiKey: process.env.FT_API_KEY!,
  };
}

async function ftPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${FT_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...getCredentials(), ...body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FUT Transfer API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// === Endpoint 1: Check Available Stock ===
export async function checkAvailableStock(): Promise<FTAvailableStockResponse> {
  return ftPost<FTAvailableStockResponse>("/availableStockAPI", {});
}

// === Endpoint 2: Create Internal Order ===
export async function createInternalOrder(params: {
  customerName: string;
  user: string; // EA email
  pass: string; // EA password
  ba: string;
  ba2: string;
  ba3: string;
  platform: Platform;
  amount: number; // in K
  externalOrderID: string;
  topUpEnabled: number;
}): Promise<FTOrderResponse> {
  return ftPost<FTOrderResponse>("/orderAPI", {
    customerName: params.customerName,
    user: params.user,
    pass: params.pass,
    ba: params.ba,
    ba2: params.ba2,
    ba3: params.ba3,
    platform: params.platform,
    amount: params.amount,
    transferMethod: "targetedSnipe",
    externalOrderID: params.externalOrderID,
    updateCustomer: 1,
    lockOnboarding: 0,
    disableCustomerLock: 0,
    topUpEnabled: params.topUpEnabled,
    autoFinishCycle: 1,
  });
}

// === Endpoint 3: Buy Coins (External Market) ===
export async function buyCoins(params: {
  customerName: string;
  user: string;
  pass: string;
  ba: string;
  ba2: string;
  ba3: string;
  platform: Platform;
  amount: number;
  externalOrderID: string;
  buyNowThreshold: number; // max price per 100K in EUR
  topUpEnabled: number;
}): Promise<FTOrderResponse> {
  return ftPost<FTOrderResponse>("/buyCoinsAPI", {
    customerName: params.customerName,
    user: params.user,
    pass: params.pass,
    ba: params.ba,
    ba2: params.ba2,
    ba3: params.ba3,
    platform: params.platform,
    amount: params.amount,
    transferMethod: "targetedSnipe",
    externalOrderID: params.externalOrderID,
    updateCustomer: 1,
    buyNowThreshold: params.buyNowThreshold,
    topUpEnabled: params.topUpEnabled,
    autoFinishCycle: 1,
  });
}

// === Endpoint 5: Query Order Status (Single) ===
export async function getOrderStatus(params: {
  orderID: string;
  useExternalID?: boolean;
  isMotherID?: boolean;
}): Promise<FTOrderStatusResponse> {
  return ftPost<FTOrderStatusResponse>("/orderStatusAPI", {
    orderID: params.orderID,
    ...(params.useExternalID ? { externalID: 1 } : {}),
    ...(params.isMotherID ? { isMotherID: 1 } : {}),
  });
}

// === Endpoint 6: Query Order Status (Bulk — up to 20) ===
export async function getOrderStatusBulk(params: {
  orderIDs: string[];
  isMotherID?: boolean;
}): Promise<FTBulkStatusResponse> {
  return ftPost<FTBulkStatusResponse>("/orderStatusBulkAPI", {
    orderIDs: params.orderIDs,
    ...(params.isMotherID ? { isMotherID: 1 } : {}),
  });
}

// === User Stats (for EUR/USD exchange rate) ===

interface FTUserStatsResponse {
  currency: string;
  usdExchange: string;
  [key: string]: unknown;
}

export async function getUserStats(): Promise<FTUserStatsResponse> {
  return ftPost<FTUserStatsResponse>("/getUserStats.php", {});
}

// Fallback rate if FT API is unreachable
const DEFAULT_EUR_USD_RATE = 1.18;
// Cache duration: 24 hours in ms
const RATE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get the EUR→USD exchange rate, cached in system_settings.
 * Refreshes from FUT Transfer /getUserStats.php if older than 24 hours.
 */
export async function getEurToUsdRate(): Promise<number> {
  const supabase = createAdminClient();

  // Check cached rate
  const { data: rateSetting } = await supabase
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", "ft_eur_usd_rate")
    .single();

  if (rateSetting) {
    const age = Date.now() - new Date(rateSetting.updated_at).getTime();
    if (age < RATE_CACHE_DURATION_MS) {
      const cached = parseFloat(rateSetting.value);
      if (!isNaN(cached) && cached > 0) return cached;
    }
  }

  // Fetch fresh rate from FT API
  try {
    const stats = await getUserStats();
    const rate = parseFloat(stats.usdExchange);
    if (isNaN(rate) || rate <= 0) {
      console.warn("FT getUserStats returned invalid usdExchange:", stats.usdExchange);
      return rateSetting ? parseFloat(rateSetting.value) || DEFAULT_EUR_USD_RATE : DEFAULT_EUR_USD_RATE;
    }

    // Cache the rate in system_settings
    await supabase
      .from("system_settings")
      .upsert(
        {
          key: "ft_eur_usd_rate",
          value: String(rate),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    return rate;
  } catch (err) {
    console.error("Failed to fetch EUR/USD rate from FT:", err);
    // Return cached value or default
    if (rateSetting) {
      const cached = parseFloat(rateSetting.value);
      if (!isNaN(cached) && cached > 0) return cached;
    }
    return DEFAULT_EUR_USD_RATE;
  }
}

/**
 * Convert EUR amount to USD using the cached exchange rate.
 */
export async function eurToUsd(eurAmount: number): Promise<number> {
  const rate = await getEurToUsdRate();
  return Math.round(eurAmount * rate * 100) / 100;
}

// === FUT Transfer Status Mapping ===

const CUSTOMER_ISSUES = [
  "wrongBA", "wrongUserPass", "wrongConsole", "noClub",
  "tlFull", "notEnoughCoins", "console", "noTM",
  "wrongPersona", "unassignedItemsPresent", "captcha",
  "FailWebAppCustomerLocked", "FailLoggedInConsoleTo",
  "FailedWrongCredentialsTo", "FailedWrongBACodeTo",
  "FailWebAppNotYetUnlocked", "FailedTLfullReceiver",
  "belowMinTransfer",
];

export function mapFTStatusToOurStatus(
  ftStatus: string,
  accountCheck: string,
  economyState: string
): string {
  // Finished successfully
  if (ftStatus === "finished") return "completed";

  // Active / in progress
  if (ftStatus === "entered" || ftStatus === "ready") return "processing";
  if (ftStatus === "partlyDelivered") return "shipping";
  if (ftStatus === "waitingForAssignment") return "processing";

  // Interrupted — check WHY
  if (ftStatus === "interrupted") {
    if (CUSTOMER_ISSUES.includes(accountCheck) || CUSTOMER_ISSUES.includes(economyState)) {
      return "on_hold_customer";
    }
    return "on_hold_internal";
  }

  return "processing"; // fallback
}
