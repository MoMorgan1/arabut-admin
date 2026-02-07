import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCards from "@/components/dashboard/StatsCards";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrderTypesPie from "@/components/dashboard/OrderTypesPie";

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getLast7Days() {
  const days: { date: string; label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      label: d.toLocaleDateString("ar-SA", { weekday: "short", day: "numeric", month: "short" }),
      revenue: 0,
    });
  }
  return days;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { start, end } = getMonthBounds();

  // Orders count (all time for total, or we can do month)
  const { count: ordersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  // Settled revenue this month
  const { data: ordersRevenue } = await supabase
    .from("orders")
    .select("settled_amount, order_date")
    .gte("order_date", start)
    .lte("order_date", end)
    .not("settled_amount", "is", null);

  const revenue =
    ordersRevenue?.reduce((s, o) => s + (o.settled_amount ?? 0), 0) ?? 0;

  // Completed vs pending (this month)
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("status");
  const completed =
    orderItems?.filter((i) => i.status === "completed" || i.status === "completed_comp").length ?? 0;
  const pending =
    orderItems?.filter((i) =>
      ["new", "processing", "shipping", "in_progress", "credentials_sent"].includes(i.status)
    ).length ?? 0;

  // Revenue by day (last 7 days) — from orders with settled_amount
  const last7 = getLast7Days();
  const { data: ordersByDay } = await supabase
    .from("orders")
    .select("order_date, settled_amount")
    .not("settled_amount", "is", null)
    .gte("order_date", last7[0].date)
    .lte("order_date", last7[6].date + "T23:59:59");

  for (const row of ordersByDay ?? []) {
    const dateStr = row.order_date.slice(0, 10);
    const day = last7.find((d) => d.date === dateStr);
    if (day) day.revenue += row.settled_amount ?? 0;
  }

  // Order types breakdown (all items)
  const { data: itemsByType } = await supabase
    .from("order_items")
    .select("item_type");
  const typeCount: Record<string, number> = {};
  for (const i of itemsByType ?? []) {
    typeCount[i.item_type] = (typeCount[i.item_type] ?? 0) + 1;
  }
  const orderTypesData = Object.entries(typeCount).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على الطلبات والإيرادات</p>
      </div>

      <StatsCards
        ordersCount={ordersCount ?? 0}
        revenue={revenue}
        ordersCompleted={completed}
        ordersPending={pending}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات المسوّاة — آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={last7} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>توزيع الطلبات حسب النوع</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTypesPie data={orderTypesData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
