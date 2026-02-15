import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCards from "@/components/dashboard/StatsCards";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

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
      label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
      revenue: 0,
    });
  }
  return days;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: "admin" | "employee" | "supplier" | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  if (role === "supplier" && user) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id, balance")
      .eq("user_id", user.id)
      .single();

    let assignedCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    if (supplier?.id) {
      const { data: items } = await supabase
        .from("order_items")
        .select("status")
        .eq("supplier_id", supplier.id);

      assignedCount = items?.length ?? 0;
      completedCount =
        items?.filter((i) => i.status === "completed" || i.status === "completed_comp").length ?? 0;
      pendingCount =
        items?.filter((i) =>
          ["new", "processing", "shipping", "in_progress", "credentials_sent"].includes(i.status)
        ).length ?? 0;
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your assigned work overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Items</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{assignedCount}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Completed Items</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{completedCount}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Items</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{pendingCount}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{supplier?.balance ?? 0}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  let ordersCount = 0;
  let revenue = 0;
  let completed = 0;
  let pending = 0;
  let last7 = getLast7Days();
  let orderTypesData: { name: string; value: number }[] = [];

  try {
    const { start, end } = getMonthBounds();

    // Orders count (all time for total, or we can do month)
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true });
    ordersCount = count ?? 0;

    // Settled revenue this month
    const { data: ordersRevenue } = await supabase
      .from("orders")
      .select("settled_amount, order_date")
      .gte("order_date", start)
      .lte("order_date", end)
      .not("settled_amount", "is", null);

    revenue =
      ordersRevenue?.reduce((s, o) => s + (o.settled_amount ?? 0), 0) ?? 0;

    // Completed vs pending (this month)
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("status");
    completed =
      orderItems?.filter((i) => i.status === "completed" || i.status === "completed_comp").length ?? 0;
    pending =
      orderItems?.filter((i) =>
        ["new", "processing", "shipping", "in_progress", "credentials_sent"].includes(i.status)
      ).length ?? 0;

    // Revenue by day (last 7 days) — from orders with settled_amount
      const sevenDayEnd = last7[6]?.date ?? last7[last7.length - 1]?.date;
      const { data: ordersByDay } = await supabase
        .from("orders")
        .select("order_date, settled_amount")
        .not("settled_amount", "is", null)
        .gte("order_date", last7[0].date)
        .lte("order_date", sevenDayEnd + "T23:59:59");

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
    orderTypesData = Object.entries(typeCount).map(([name, value]) => ({
      name,
      value,
    }));
  } catch (err) {
    console.error("Dashboard data fetch error:", err);
    // Falls through with default zero values — page still renders
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of orders and revenue</p>
      </div>

      <StatsCards
        ordersCount={ordersCount}
        revenue={revenue}
        ordersCompleted={completed}
        ordersPending={pending}
      />

      <DashboardCharts revenueData={last7} orderTypesData={orderTypesData} />
    </div>
  );
}
