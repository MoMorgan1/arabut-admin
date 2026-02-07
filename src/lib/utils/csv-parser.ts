/**
 * Parse CSV text into array of objects using headers as keys.
 * Handles quoted fields with commas and newlines inside.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Column name mapping: Arabic/English variants → standardized key.
 * Flexible to handle different column names from Google Sheets.
 */
const COLUMN_MAP: Record<string, string> = {
  // salla_order_id
  "salla_order_id": "salla_order_id",
  "order_id": "salla_order_id",
  "رقم الطلب": "salla_order_id",
  "رقم طلب سلة": "salla_order_id",
  "id": "salla_order_id",
  // customer_name
  "customer_name": "customer_name",
  "اسم العميل": "customer_name",
  "العميل": "customer_name",
  "الاسم": "customer_name",
  // customer_phone
  "customer_phone": "customer_phone",
  "رقم الجوال": "customer_phone",
  "الهاتف": "customer_phone",
  "الجوال": "customer_phone",
  // payment_method
  "payment_method": "payment_method",
  "طريقة الدفع": "payment_method",
  // salla_total_sar
  "salla_total_sar": "salla_total_sar",
  "total": "salla_total_sar",
  "المبلغ": "salla_total_sar",
  "الإجمالي": "salla_total_sar",
  "المجموع": "salla_total_sar",
  // status
  "status": "status",
  "الحالة": "status",
  "حالة الطلب": "status",
  // order_date
  "order_date": "order_date",
  "التاريخ": "order_date",
  "تاريخ الطلب": "order_date",
  "date": "order_date",
  // notes
  "notes": "notes",
  "ملاحظات": "notes",
  // item_type
  "item_type": "item_type",
  "نوع المنتج": "item_type",
  "النوع": "item_type",
  // product_name
  "product_name": "product_name",
  "المنتج": "product_name",
  "اسم المنتج": "product_name",
  // platform
  "platform": "platform",
  "المنصة": "platform",
  // coins_amount_k
  "coins_amount_k": "coins_amount_k",
  "الكمية": "coins_amount_k",
  "كمية الكوينز": "coins_amount_k",
  // settled_amount
  "settled_amount": "settled_amount",
  "مبلغ التسوية": "settled_amount",
};

/**
 * Convert CSV rows (from Google Sheets export) to migration JSON format.
 * Each row = 1 order with 1 item (flat structure from spreadsheet).
 */
export function csvRowsToMigrationOrders(
  rows: Record<string, string>[]
): { orders: MigrationOrder[] } {
  // Map columns
  const mapped = rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = COLUMN_MAP[key.trim()] ?? COLUMN_MAP[key.trim().toLowerCase()];
      if (mappedKey) {
        normalized[mappedKey] = value;
      }
    }
    return normalized;
  });

  // Group by salla_order_id (multiple rows can belong to same order)
  const orderMap = new Map<string, MigrationOrder>();

  for (const row of mapped) {
    const sallaId = row.salla_order_id;
    if (!sallaId) continue;

    if (!orderMap.has(sallaId)) {
      orderMap.set(sallaId, {
        salla_order_id: sallaId,
        customer_name: row.customer_name || `عميل ${sallaId}`,
        customer_phone: row.customer_phone || undefined,
        payment_method: row.payment_method || undefined,
        salla_total_sar: row.salla_total_sar ? parseFloat(row.salla_total_sar) : undefined,
        status: row.status || "new",
        order_date: row.order_date || new Date().toISOString().slice(0, 10),
        notes: row.notes || undefined,
        settled_amount: row.settled_amount ? parseFloat(row.settled_amount) : undefined,
        items: [],
      });
    }

    const order = orderMap.get(sallaId)!;

    // Add item if product_name or item_type exists
    if (row.product_name || row.item_type) {
      order.items.push({
        item_type: row.item_type || "other",
        product_name: row.product_name || `منتج ${sallaId}`,
        status: row.status || "new",
        platform: row.platform || undefined,
        coins_amount_k: row.coins_amount_k ? parseInt(row.coins_amount_k) : undefined,
      });
    }
  }

  return { orders: Array.from(orderMap.values()) };
}

interface MigrationOrder {
  salla_order_id: string;
  customer_name: string;
  customer_phone?: string;
  payment_method?: string;
  salla_total_sar?: number;
  status: string;
  order_date: string;
  notes?: string;
  settled_amount?: number;
  items: {
    item_type: string;
    product_name: string;
    status?: string;
    platform?: string;
    coins_amount_k?: number;
  }[];
}
