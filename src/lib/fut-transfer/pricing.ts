import type { Platform, ShippingType } from "@/types/database";
import { PRICING } from "@/lib/utils/constants";

/**
 * Calculate the max price per 100K coins in EUR
 * Used when sending buyCoinsAPI requests to FUT Transfer
 */
export function calculateMaxPricePer100K(
  platform: Platform,
  amountK: number,
  isSlow: boolean
): number {
  const prices = platform === "PC" ? PRICING.PC : PRICING.PS;
  let targetPerMillionUSD: number;

  if (isSlow) {
    targetPerMillionUSD = prices.slow_AnyQty;
  } else if (amountK <= 700) {
    targetPerMillionUSD = prices.fast_Tier1;
  } else if (amountK <= 1500) {
    targetPerMillionUSD = prices.fast_Tier2;
  } else if (amountK <= 2000) {
    targetPerMillionUSD = prices.fast_Tier3;
  } else if (amountK <= 5000) {
    targetPerMillionUSD = prices.fast_Tier4;
  } else {
    targetPerMillionUSD = prices.fast_Tier5;
  }

  const perMillionEUR = targetPerMillionUSD * PRICING.usdToEurRate;
  return Math.round((perMillionEUR / 10) * 100) / 100; // per 100K EUR
}

/**
 * Calculate expected cost in USD
 * From N8N append-to-sheet formula
 */
export function calculateExpectedCostUSD(
  maxPricePer100K: number,
  amountK: number
): number {
  return (maxPricePer100K / 0.85) * (amountK / 100);
}

/**
 * Get the topUpEnabled value based on amount tier
 */
export function getTopUpEnabled(amountK: number): number {
  if (amountK <= 300) return 20;
  if (amountK <= 500) return 50;
  if (amountK <= 1000) return 100;
  if (amountK <= 1500) return 150;
  return 200;
}

/**
 * Decide whether to use internal (orderAPI) or external (buyCoinsAPI)
 */
export function shouldUseInternalStock(
  platform: Platform,
  amountK: number,
  platformStock: number
): boolean {
  const hasEnoughStock = (platformStock * 1.1) / 1000 >= amountK;
  const isEligible = platform === "PC" || amountK >= 2000;
  return hasEnoughStock && isEligible;
}

/**
 * Get pricing info for an item (to display in the UI)
 */
export function getPricingInfo(
  platform: Platform,
  amountK: number,
  shippingType: ShippingType
) {
  const isSlow = shippingType === "slow";
  const maxPriceEur = calculateMaxPricePer100K(platform, amountK, isSlow);
  const expectedCost = calculateExpectedCostUSD(maxPriceEur, amountK);
  const topUpEnabled = getTopUpEnabled(amountK);

  return {
    maxPriceEur,
    expectedCost,
    topUpEnabled,
  };
}
