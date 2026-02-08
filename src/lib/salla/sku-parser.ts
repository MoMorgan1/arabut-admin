import type { OrderType, Platform, ShippingType } from "@/types/database";
import type { SallaItem, SallaItemOption } from "@/types/api";

/**
 * Detect product type from SKU and product name
 */
export function detectProductType(sku: string, productName: string): OrderType {
  const skuUpper = sku.toUpperCase();
  const nameLower = productName.toLowerCase();

  // Coins detection
  if (skuUpper.includes("COIN")) return "coins";

  // Service detection from product name
  if (nameLower.includes("فوت") || nameLower.includes("fut")) return "fut";
  if (nameLower.includes("رايفلز") || nameLower.includes("rivals") || nameLower.includes("rivales")) return "rivales";
  if (
    nameLower.includes("مهام") ||
    nameLower.includes("objectives") ||
    nameLower.includes("تحدي") ||
    nameLower.includes("sbc")
  )
    return "sbc";

  return "other";
}

/**
 * Extract a string value from a Salla option
 */
function getOptionValue(option: SallaItemOption): string {
  if (typeof option.value === "string") return option.value;
  if (typeof option.value === "object" && option.value !== null) {
    return option.value.name ?? "";
  }
  return "";
}

/**
 * Parse all relevant fields from item options
 */
export interface ParsedItemOptions {
  email: string | null;
  password: string | null;
  backupCode1: string | null;
  backupCode2: string | null;
  backupCode3: string | null;
  platform: Platform;
  amountK: number | null;
  shippingType: ShippingType;
}

export function parseItemOptions(
  item: SallaItem
): ParsedItemOptions {
  let email: string | null = null;
  let password: string | null = null;
  const backupCodes: string[] = [];
  let platform: Platform = "PS";
  let amountK: number | null = null;
  let shippingType: ShippingType = "fast";

  for (const option of item.options) {
    const name = option.name.toLowerCase();
    const value = getOptionValue(option);

    // Email
    if (name.includes("ايميل") || name.includes("email")) {
      email = value;
    }

    // Password
    if (name.includes("باسورد") || name.includes("pass")) {
      password = value;
    }

    // Backup codes
    if (
      name.includes("الكود الاحتياطي") ||
      name.includes("backup") ||
      name.includes("code")
    ) {
      backupCodes.push(value);
    }

    // Platform
    if (name.includes("المنصة") || name.includes("platform")) {
      platform = value.toUpperCase().includes("PC") ? "PC" : "PS";
    }

    // Amount
    if (name.includes("الكمية") || name.includes("amount")) {
      const numMatch = value.match(/[\d.]+/);
      if (numMatch) {
        let num = parseFloat(numMatch[0]);
        // If "مليون" (million) is in the value, multiply by 1000
        if (value.includes("مليون") || value.includes("million")) {
          num = num * 1000;
        }
        amountK = num;
      }
    }

    // Shipping type
    if (name.includes("نوع الشحن") || name.includes("protection")) {
      if (value.includes("عادي") || value.includes("بطيء") || value.includes("slow")) {
        shippingType = "slow";
      }
    }
  }

  // Fallback platform detection from SKU / product name
  const skuUpper = item.sku.toUpperCase();
  const nameLower = item.name.toLowerCase();
  if (skuUpper.includes("PC") || nameLower.includes("pc") || nameLower.includes("بي سي") || nameLower.includes("computer")) {
    platform = "PC";
  }

  return {
    email,
    password,
    backupCode1: backupCodes[0] ?? null,
    backupCode2: backupCodes[1] ?? null,
    backupCode3: backupCodes[2] ?? null,
    platform,
    amountK,
    shippingType,
  };
}
