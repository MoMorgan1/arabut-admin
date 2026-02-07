import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderStatusBulk, mapFTStatusToOurStatus } from "@/lib/fut-transfer/api";
import { chunkArray } from "@/lib/utils/helpers";
import { getWorstStatus } from "@/lib/utils/helpers";
import { ACCOUNT_CHECK_NOTES } from "@/lib/utils/constants";

const BULK_SIZE = 20;

export async function GET(request: NextRequest) {
  // Optional: verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Get coins order items that are in progress and have ft_order_id
  const { data: items, error: fetchError } = await supabase
    .from("order_items")
    .select("id, order_id, ft_order_id, status")
    .eq("item_type", "coins")
    .in("status", ["processing", "shipping"])
    .not("ft_order_id", "is", null);

  if (fetchError) {
    console.error("Cron sync-ft: fetch error", fetchError);
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  if (!items?.length) {
    return NextResponse.json({ synced: 0, message: "No items to sync" });
  }

  const chunks = chunkArray(items, BULK_SIZE);
  let updatedCount = 0;
  const orderIdsToCheck: Set<string> = new Set();

  for (const chunk of chunks) {
    const orderIds = chunk.map((i) => i.ft_order_id!);

    try {
      const bulkResponse = await getOrderStatusBulk({ orderIDs: orderIds });
      const itemByFtId = new Map(chunk.map((i) => [i.ft_order_id, i]));

      for (const [ftOrderId, res] of Object.entries(bulkResponse)) {
        const item = itemByFtId.get(ftOrderId);
        if (!item) continue;

        const newStatus = mapFTStatusToOurStatus(
          res.status,
          res.accountCheck ?? "",
          res.economyState ?? ""
        );

        const updatePayload: Record<string, unknown> = {
          status: newStatus,
          ft_status: res.status,
          ft_last_synced: new Date().toISOString(),
          actual_cost: res.toPay ?? null,
          updated_at: new Date().toISOString(),
        };

        // Auto-set customer note from accountCheck for interrupted orders
        if (res.status === "interrupted" && res.accountCheck) {
          const note = ACCOUNT_CHECK_NOTES[res.accountCheck];
          if (note) {
            updatePayload.customer_note = note;
          }
        }

        const { error: updateError } = await supabase
          .from("order_items")
          .update(updatePayload)
          .eq("id", item.id);

        if (!updateError) {
          updatedCount++;
          orderIdsToCheck.add(item.order_id);
        }

        // Log only when status actually changed
        if (newStatus !== item.status) {
          await supabase.from("order_status_log").insert({
            order_item_id: item.id,
            old_status: item.status,
            new_status: newStatus,
            note: res.status === "interrupted" ? (updatePayload.customer_note as string) : "تحديث تلقائي من FUT Transfer",
          });
        }
      }
    } catch (err) {
      console.error("Cron sync-ft: bulk API error", err);
      // Continue with next chunk
    }
  }

  // 5. For each order, if all items completed → update parent order status
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
    synced: updatedCount,
    ordersChecked: orderIdsToCheck.size,
  });
}
