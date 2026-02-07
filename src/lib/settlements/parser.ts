import * as XLSX from "xlsx";

export interface SettlementRow {
  salla_order_id: string;
  settled_amount: number;
}

const ORDER_ID_ALIASES = [
  "order_id",
  "salla_order_id",
  "order id",
  "رقم الطلب",
  "رقم الطلبية",
  "id",
];

const AMOUNT_ALIASES = [
  "amount",
  "settled_amount",
  "amount_after_tax",
  "المبلغ",
  "المبلغ بعد الضريبة",
  "مبلغ",
];

function normalizeHeader(header: string): string {
  return String(header ?? "").trim().toLowerCase();
}

function findColumnIndex(
  headers: string[],
  aliases: string[]
): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  // Fallback: first column for order id, second for amount
  if (aliases === ORDER_ID_ALIASES) return 0;
  if (aliases === AMOUNT_ALIASES) return 1;
  return -1;
}

/**
 * Parse Salla settlement Excel file.
 * Expects first row as headers, then rows with order_id and amount.
 */
export function parseSettlementExcel(buffer: ArrayBuffer): SettlementRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (data.length < 2) return [];

  const headers = data[0].map((h) => String(h ?? "").trim());
  const orderIdIdx = findColumnIndex(headers, ORDER_ID_ALIASES);
  const amountIdx = findColumnIndex(headers, AMOUNT_ALIASES);

  if (orderIdIdx < 0 || amountIdx < 0) {
    throw new Error(
      "File must contain an order ID column and an amount column (e.g., order_id, amount)"
    );
  }

  const rows: SettlementRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = String(row[orderIdIdx] ?? "").trim();
    const amountRaw = row[amountIdx];
    const amount =
      typeof amountRaw === "number"
        ? amountRaw
        : parseFloat(String(amountRaw ?? "").replace(/,/g, ""));

    if (!orderId || Number.isNaN(amount)) continue;

    rows.push({
      salla_order_id: orderId,
      settled_amount: Math.round(amount * 100) / 100,
    });
  }

  return rows;
}
