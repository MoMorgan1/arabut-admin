import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OrderDetail, { type OrderDetailData } from "@/components/orders/OrderDetail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch items, suppliers, and global exchange rate in parallel
  // Use admin client for system_settings to bypass RLS and always get the real value
  const [{ data: orderItems }, { data: suppliers }, { data: rateSetting }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("display_name"),
      adminSupabase
        .from("system_settings")
        .select("value")
        .eq("key", "exchange_rate")
        .single(),
    ]);

  const globalExchangeRate = rateSetting?.value
    ? parseFloat(rateSetting.value)
    : 3.75;

  const itemIds = (orderItems ?? []).map((i) => i.id);

  let statusLogByItem: Record<string, { id: string; order_item_id: string; old_status: string | null; new_status: string; changed_by: string | null; note: string | null; created_at: string }[]> = {};

  if (itemIds.length > 0) {
    const { data: logs } = await supabase
      .from("order_status_log")
      .select("*")
      .in("order_item_id", itemIds)
      .order("created_at", { ascending: false });

    for (const log of logs ?? []) {
      const key = log.order_item_id;
      if (!statusLogByItem[key]) statusLogByItem[key] = [];
      statusLogByItem[key].push(log);
    }
  }

  const orderWithItems: OrderDetailData = {
    ...order,
    order_items: (orderItems ?? []).map((item) => ({
      ...item,
      status_log: statusLogByItem[item.id] ?? [],
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
      </div>
      <OrderDetail
        order={orderWithItems}
        suppliers={suppliers ?? []}
        globalExchangeRate={globalExchangeRate}
      />
    </div>
  );
}
