// General helper utilities

/**
 * Determine the worst (most critical) status from a list of item statuses.
 * Used to derive the parent order's overall status.
 */
const STATUS_PRIORITY: Record<string, number> = {
  on_hold_customer: 1,
  on_hold_internal: 2,
  new: 3,
  processing: 4,
  credentials_sent: 4,
  shipping: 5,
  in_progress: 5,
  completed: 8,
  completed_comp: 8,
  cancelled: 9,
  refunded: 10,
};

export function getWorstStatus(statuses: string[]): string {
  if (statuses.length === 0) return "new";

  let worst = statuses[0];
  let worstPriority = STATUS_PRIORITY[worst] ?? 99;

  for (const status of statuses) {
    const priority = STATUS_PRIORITY[status] ?? 99;
    if (priority < worstPriority) {
      worst = status;
      worstPriority = priority;
    }
  }

  return worst;
}

/**
 * Safe JSON parse — returns null on failure
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Delay helper for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk an array into groups of N (for bulk API calls)
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
