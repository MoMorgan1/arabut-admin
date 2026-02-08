import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrderStatusBulk, mapFTStatusToOurStatus, eurToUsd } from "@/lib/fut-transfer/api";
import { ACCOUNT_CHECK_NOTES } from "@/lib/utils/constants";
import { getWorstStatus, chunkArray } from "@/lib/utils/helpers";

const BULK_SIZE = 20;
const TERMINAL_STATUSES = ["completed", "completed_comp", "cancelled", "refunded"];

/**
 * GET /api/sync-ft-all
 *
 * Syncs ALL active FUT Transfer-linked order items (non-terminal status).
 * Uses the bulk API (up to 20 per call) for efficiency.
 * Returns summary + per-item raw FT responses for network debugging.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.FT_API_USER || !process.env.FT_API_KEY) {
      return NextResponse.json(
        { error: "FUT Transfer API credentials not configured" },
        { status: 500 }
      );
    }

    // Fetch all FT-linked items that are NOT in a terminal status
    const { data: items, error: fetchErr } = await supabase
      .from("order_items")
      .select("id, order_id, ft_order_id, status, item_type, coins_amount_k")
      .not("ft_order_id", "is", null)
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`);

    if (fetchErr) {
      return NextResponse.json(
        { error: "Failed to fetch items: " + fetchErr.message },
        { status: 500 }
      );
    }

    if (!items?.length) {
      return NextResponse.json({
        synced: 0,
        message: "No active FT-linked items",
        results: [],
      });
    }

    const chunks = chunkArray(items, BULK_SIZE);
    const results: Array<{
      itemId: string;
      orderId: string;
      ftOrderId: string;
      ftRawResponse: Record<string, unknown>;
      previousStatus: string;
      newStatus: string;
      coinsDeliveredK: number | null;
      statusChanged: boolean;
    }> = [];
    const orderIdsToCheck = new Set<string>();

    for (const chunk of chunks) {
      const ftOrderIds = chunk.map((i) => i.ft_order_id!);

      try {
        const bulkRes = await getOrderStatusBulk({ orderIDs: ftOrderIds });
        const itemByFtId = new Map(chunk.map((i) => [i.ft_order_id, i]));

        for (const [ftOrderId, ftRes] of Object.entries(bulkRes)) {
          const item = itemByFtId.get(ftOrderId);
          if (!item) continue;

          const newStatus = mapFTStatusToOurStatus(
            ftRes.status,
            ftRes.accountCheck ?? "",
            ftRes.economyState ?? ""
          );

          // Convert toPay from EUR to USD
          const actualCostUsd = ftRes.toPay != null ? await eurToUsd(ftRes.toPay) : null;

          const updatePayload: Record<string, unknown> = {
            status: newStatus,
            ft_status: ftRes.economyStateLong || ftRes.economyState || ftRes.status,
            ft_last_synced: new Date().toISOString(),
            actual_cost: actualCostUsd,
            updated_at: new Date().toISOString(),
          };

          // Auto-track coins delivery — "amount" = K delivered so far
          let coinsDeliveredK: number | null = null;
          if (ftRes.amountOrdered != null && ftRes.amountOrdered > 0) {
            if (ftRes.status === "finished") {
              coinsDeliveredK = ftRes.amountOrdered;
            } else if (ftRes.amount != null && ftRes.amount > 0) {
              coinsDeliveredK = ftRes.amount;
            }
            if (coinsDeliveredK != null) {
              updatePayload.coins_delivered_k = coinsDeliveredK;
            }
          }

          if (ftRes.status === "interrupted" && ftRes.accountCheck) {
            const note = ACCOUNT_CHECK_NOTES[ftRes.accountCheck];
            if (note) updatePayload.customer_note = note;
          }

          const { error: updateError } = await supabase
            .from("order_items")
            .update(updatePayload)
            .eq("id", item.id);

          if (!updateError) {
            orderIdsToCheck.add(item.order_id);
          }

          if (newStatus !== item.status) {
            await supabase.from("order_status_log").insert({
              order_item_id: item.id,
              old_status: item.status,
              new_status: newStatus,
              note: "Auto sync from FUT Transfer",
            });
          }

          results.push({
            itemId: item.id,
            orderId: item.order_id,
            ftOrderId,
            ftRawResponse: ftRes as unknown as Record<string, unknown>,
            previousStatus: item.status,
            newStatus,
            coinsDeliveredK,
            statusChanged: newStatus !== item.status,
          });
        }
      } catch (err) {
        console.error("sync-ft-all: bulk API error for chunk", err);
      }
    }

    // Update parent order statuses
    for (const orderId of orderIdsToCheck) {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId);

      if (orderItems?.length) {
        const worst = getWorstStatus(orderItems.map((i) => i.status));
        await supabase
          .from("orders")
          .update({ status: worst, updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }
    }

    return NextResponse.json({
      synced: results.length,
      ordersUpdated: orderIdsToCheck.size,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync-ft-all error:", err);
    return NextResponse.json(
      { error: `Sync failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
