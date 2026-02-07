import type { Platform } from "@/types/database";
import type {
  FTAvailableStockResponse,
  FTOrderResponse,
  FTOrderStatusResponse,
  FTBulkStatusResponse,
} from "@/types/api";

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
