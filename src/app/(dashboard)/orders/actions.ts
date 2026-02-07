"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, ACCOUNT_CHECK_NOTES } from "@/lib/utils/constants";

const VALID_STATUSES = Object.keys(STATUS_LABELS);

export async function updateOrderItemStatus(
  orderItemId: string,
  newStatus: string,
  note?: string
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!orderItemId?.trim()) return { error: "Item ID is required" };
  if (!VALID_STATUSES.includes(newStatus)) return { error: "Invalid status" };

  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("status, order_id")
    .eq("id", orderItemId)
    .single();

  if (fetchError || !item) {
    return { error: "Item not found" };
  }

  const oldStatus = item.status;

  const { error: updateError } = await supabase
    .from("order_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderItemId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.from("order_status_log").insert({
    order_item_id: orderItemId,
    old_status: oldStatus,
    new_status: newStatus,
    note: note ?? null,
  });

  // Update parent order status to worst of all items
  const { data: siblings } = await supabase
    .from("order_items")
    .select("status")
    .eq("order_id", item.order_id);

  if (siblings?.length) {
    const { getWorstStatus } = await import("@/lib/utils/helpers");
    const worst = getWorstStatus(siblings.map((s) => s.status));
    await supabase
      .from("orders")
      .update({ status: worst, updated_at: new Date().toISOString() })
      .eq("id", item.order_id);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${item.order_id}`);

  return { success: true };
}

export async function bulkUpdateOrdersStatusAction(
  orderIds: string[],
  newStatus: string
) {
  if (!orderIds.length) return { error: "No orders selected" };
  if (!VALID_STATUSES.includes(newStatus)) return { error: "Invalid status" };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, status")
    .in("order_id", orderIds);

  if (!items?.length) return { error: "No items found in selected orders" };

  for (const item of items) {
    const oldStatus = item.status;
    await supabase
      .from("order_items")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    await supabase.from("order_status_log").insert({
      order_item_id: item.id,
      old_status: oldStatus,
      new_status: newStatus,
      note: "Bulk update",
    });
  }

  const orderIdsToUpdate = [...new Set(items.map((i) => i.order_id))];
  for (const orderId of orderIdsToUpdate) {
    const { data: siblings } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", orderId);
    if (siblings?.length) {
      const { getWorstStatus } = await import("@/lib/utils/helpers");
      const worst = getWorstStatus(siblings.map((s) => s.status));
      await supabase
        .from("orders")
        .update({ status: worst, updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }
  }

  revalidatePath("/orders");
  for (const id of orderIdsToUpdate) {
    revalidatePath(`/orders/${id}`);
  }
  return { success: true, updated: items.length };
}

export async function updateOrderAction(
  orderId: string,
  params: {
    customer_name?: string;
    customer_phone?: string;
    salla_total_sar?: number | null;
    exchange_rate?: number | null;
    notes?: string;
    status?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!orderId?.trim()) return { error: "Order ID is required" };

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.customer_name !== undefined) updateData.customer_name = params.customer_name.trim();
  if (params.customer_phone !== undefined) updateData.customer_phone = params.customer_phone.trim() || null;
  if (params.salla_total_sar !== undefined) updateData.salla_total_sar = params.salla_total_sar;
  if (params.exchange_rate !== undefined) updateData.exchange_rate = params.exchange_rate;
  if (params.notes !== undefined) updateData.notes = params.notes.trim() || null;
  if (params.status !== undefined) updateData.status = params.status;

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

// ===== Sync single item from FUT Transfer =====
export async function syncFTStatusAction(orderItemId: string) {
  try {
    if (!process.env.FT_API_USER || !process.env.FT_API_KEY) {
      return {
        error:
          "FUT Transfer API credentials missing.\nEnsure FT_API_USER and FT_API_KEY are set in .env.local",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    if (!orderItemId?.trim()) return { error: "Item ID is required" };

    const { data: item, error: fetchErr } = await supabase
      .from("order_items")
      .select("id, order_id, ft_order_id, status")
      .eq("id", orderItemId)
      .single();

    if (fetchErr || !item) {
      return { error: "Item not found: " + (fetchErr?.message ?? "unknown") };
    }
    if (!item.ft_order_id) {
      return { error: "This item is not linked to FUT Transfer" };
    }

    const { getOrderStatus, mapFTStatusToOurStatus } = await import(
      "@/lib/fut-transfer/api"
    );
    const res = await getOrderStatus({ orderID: item.ft_order_id });

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

    // Auto-track coins delivery progress from FUT Transfer
    // coinsUsed = coins delivered so far (in absolute coins, divide by 1000 for K)
    // amountOrdered = total K ordered
    if (res.amountOrdered != null && res.amountOrdered > 0) {
      if (res.status === "finished") {
        // Fully delivered — set delivered = ordered
        updatePayload.coins_delivered_k = res.amountOrdered;
      } else if (res.coinsUsed != null && res.coinsUsed > 0) {
        // Partially delivered — coinsUsed is in absolute coins (÷1000 = K)
        updatePayload.coins_delivered_k = Math.round((res.coinsUsed / 1000) * 100) / 100;
      }
    }

    if (res.status === "interrupted" && res.accountCheck) {
      const note = ACCOUNT_CHECK_NOTES[res.accountCheck];
      if (note) updatePayload.customer_note = note;
    }

    const { error: updateErr } = await supabase
      .from("order_items")
      .update(updatePayload)
      .eq("id", item.id);

    if (updateErr) {
      return { error: "Failed to update item: " + updateErr.message };
    }

    if (newStatus !== item.status) {
      await supabase.from("order_status_log").insert({
        order_item_id: item.id,
        old_status: item.status,
        new_status: newStatus,
        note: "Manual sync from FUT Transfer",
      });
    }

    // Update parent order status
    const { data: siblings } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", item.order_id);

    if (siblings?.length) {
      const { getWorstStatus } = await import("@/lib/utils/helpers");
      const worst = getWorstStatus(siblings.map((s) => s.status));
      await supabase
        .from("orders")
        .update({ status: worst, updated_at: new Date().toISOString() })
        .eq("id", item.order_id);
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${item.order_id}`);

    return {
      success: true,
      ftStatus: res.status,
      newStatus,
      actualCost: res.toPay ?? null,
      coinsDeliveredK: updatePayload.coins_delivered_k ?? null,
    };
  } catch (err) {
    console.error("syncFTStatusAction error:", err);
    return {
      error: `FUT Transfer connection failed: ${(err as Error).message}`,
    };
  }
}

// ===== Update order item details (cost, supplier, notes, challenges) =====
export async function updateOrderItemAction(
  orderItemId: string,
  params: {
    actual_cost?: number | null;
    expected_cost?: number | null;
    supplier_id?: string | null;
    notes?: string;
    challenges_count?: number | null;
    coins_delivered_k?: number | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!orderItemId?.trim()) return { error: "Item ID is required" };

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.actual_cost !== undefined) updateData.actual_cost = params.actual_cost;
  if (params.expected_cost !== undefined) updateData.expected_cost = params.expected_cost;
  if (params.supplier_id !== undefined) updateData.supplier_id = params.supplier_id || null;
  if (params.notes !== undefined) updateData.notes = params.notes?.trim() || null;
  if (params.challenges_count !== undefined) updateData.challenges_count = params.challenges_count;
  if (params.coins_delivered_k !== undefined) updateData.coins_delivered_k = params.coins_delivered_k;

  const { error } = await supabase
    .from("order_items")
    .update(updateData)
    .eq("id", orderItemId);

  if (error) return { error: error.message };

  // get order_id for revalidation
  const { data: item } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("id", orderItemId)
    .single();

  revalidatePath("/orders");
  if (item) revalidatePath(`/orders/${item.order_id}`);
  return { success: true };
}
