"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOrderItemStatus(
  orderItemId: string,
  newStatus: string,
  note?: string
) {
  const supabase = await createClient();

  // Get current item to read old status and order_id
  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("status, order_id")
    .eq("id", orderItemId)
    .single();

  if (fetchError || !item) {
    return { error: "العنصر غير موجود" };
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
  if (!orderIds.length) return { error: "لم يتم اختيار أي طلب" };

  const supabase = await createClient();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, status")
    .in("order_id", orderIds);

  if (!items?.length) return { error: "لا توجد عناصر في الطلبات المحددة" };

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
      note: "تحديث جماعي",
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
