// Formatting utilities for Arabic UI

/**
 * Format a number as SAR currency
 */
export function formatSAR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `${amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

/**
 * Format a number as USD currency
 */
export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a number as EUR currency
 */
export function formatEUR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `€${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format coins amount (e.g., 500 → "500K")
 */
export function formatCoins(amountK: number | null | undefined): string {
  if (amountK == null) return "—";
  if (amountK >= 1000) {
    return `${(amountK / 1000).toFixed(amountK % 1000 === 0 ? 0 : 1)}M`;
  }
  return `${amountK}K`;
}

/**
 * Format a date string to Arabic-friendly format
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format relative time (e.g., "منذ 5 دقائق")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return formatDate(dateStr);
}

/**
 * Format platform name
 */
export function formatPlatform(platform: string | null | undefined): string {
  if (!platform) return "—";
  return platform === "PC" ? "PC" : "PlayStation";
}
