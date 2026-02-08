import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrderStatusBulk, getOrderStatus, mapFTStatusToOurStatus, eurToUsd } from "@/lib/fut-transfer/api";
import { ACCOUNT_CHECK_NOTES } from "@/lib/utils/constants";
import { getWorstStatus } from "@/lib/utils/helpers";

/**
 * POST /api/sync-ft
 * Body: { orderId: string }
 *
 * Syncs all FUT Transfer-linked items for an order.
 * Returns the raw FT API response for each item (visible in Network tab for debugging).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate FT credentials
    if (!process.env.FT_API_USER || !process.env.FT_API_KEY) {
      return NextResponse.json(
        { error: "FUT Transfer API credentials not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { orderId } = body as { orderId?: string };
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // Fetch all FT-linked items for this order
    const { data: items, error: fetchErr } = await supabase
      .from("order_items")
      .select("id, order_id, ft_order_id, status, item_type, coins_amount_k")
      .eq("order_id", orderId)
      .not("ft_order_id", "is", null);

    if (fetchErr) {
      return NextResponse.json(
        { error: "Failed to fetch items: " + fetchErr.message },
        { status: 500 }
      );
    }

    if (!items?.length) {
      return NextResponse.json({
        synced: 0,
        message: "No FT-linked items found",
        results: [],
      });
    }

    const results: Array<{
      itemId: string;
      ftOrderId: string;
      ftRawResponse: Record<string, unknown>;
      previousStatus: string;
      newStatus: string;
      coinsDeliveredK: number | null;
      statusChanged: boolean;
    }> = [];

    // Use bulk API if multiple items, single API if one
    if (items.length === 1) {
      const item = items[0];
      const ftRes = await getOrderStatus({ orderID: item.ft_order_id! });
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

      await supabase
        .from("order_items")
        .update(updatePayload)
        .eq("id", item.id);

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
        ftOrderId: item.ft_order_id!,
        ftRawResponse: ftRes as unknown as Record<string, unknown>,
        previousStatus: item.status,
        newStatus,
        coinsDeliveredK,
        statusChanged: newStatus !== item.status,
      });
    } else {
      // Bulk sync
      const ftOrderIds = items.map((i) => i.ft_order_id!);
      const bulkRes = await getOrderStatusBulk({ orderIDs: ftOrderIds });
      const itemByFtId = new Map(items.map((i) => [i.ft_order_id, i]));

      for (const [ftOrderId, ftRes] of Object.entries(bulkRes)) {
        const item = itemByFtId.get(ftOrderId);
        if (!item) continue;

        const newStatus = mapFTStatusToOurStatus(
          ftRes.status,
          ftRes.accountCheck ?? "",
          ftRes.economyState ?? ""
        );

        // Convert toPay from EUR to USD
        const bulkActualCostUsd = ftRes.toPay != null ? await eurToUsd(ftRes.toPay) : null;

        const updatePayload: Record<string, unknown> = {
          status: newStatus,
          ft_status: ftRes.economyStateLong || ftRes.economyState || ftRes.status,
          ft_last_synced: new Date().toISOString(),
          actual_cost: bulkActualCostUsd,
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

        await supabase
          .from("order_items")
          .update(updatePayload)
          .eq("id", item.id);

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
          ftOrderId,
          ftRawResponse: ftRes as unknown as Record<string, unknown>,
          previousStatus: item.status,
          newStatus,
          coinsDeliveredK,
          statusChanged: newStatus !== item.status,
        });
      }
    }

    // Update parent order status
    const { data: allItems } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", orderId);

    if (allItems?.length) {
      const worst = getWorstStatus(allItems.map((i) => i.status));
      await supabase
        .from("orders")
        .update({ status: worst, updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    return NextResponse.json({
      synced: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync-ft API error:", err);
    return NextResponse.json(
      {
        error: `FUT Transfer sync failed: ${(err as Error).message}`,
      },
      { status: 500 }
    );
  }
}
