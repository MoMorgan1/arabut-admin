import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderDetail, { type OrderDetailData } from "@/components/orders/OrderDetail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

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
            <ArrowRight className="h-4 w-4" />
            العودة للطلبات
          </Link>
        </Button>
      </div>
      <OrderDetail order={orderWithItems} />
    </div>
  );
}
