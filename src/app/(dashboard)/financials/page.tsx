import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseForm from "@/components/financials/ExpenseForm";
import SettlementUpload from "@/components/financials/SettlementUpload";
import ProfitSummary from "@/components/financials/ProfitSummary";
import { formatSAR, formatDate } from "@/lib/utils/formatters";
import { Wallet, TrendingUp, Receipt } from "lucide-react";

// Current month bounds
function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString(),
  };
}

export default async function FinancialsPage() {
  const supabase = await createClient();
  const { start, end } = getMonthBounds();

  // Settled revenue: SUM(orders.settled_amount) for orders in this month
  const { data: ordersForRevenue } = await supabase
    .from("orders")
    .select("id, settled_amount, order_date")
    .gte("order_date", start)
    .lte("order_date", end)
    .not("settled_amount", "is", null);

  const settledRevenue =
    ordersForRevenue?.reduce((sum, o) => sum + (o.settled_amount ?? 0), 0) ?? 0;

  // COGS: order_items (actual_cost or expected_cost) for orders in this month
  const { data: ordersInMonth } = await supabase
    .from("orders")
    .select("id")
    .gte("order_date", start)
    .lte("order_date", end);

  const orderIds = ordersInMonth?.map((o) => o.id) ?? [];
  let cogs = 0;
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("actual_cost, expected_cost")
      .in("order_id", orderIds);
    cogs =
      items?.reduce(
        (sum, i) => sum + (i.actual_cost ?? i.expected_cost ?? 0),
        0
      ) ?? 0;
  }

  // Expenses: monthly_share for recurring + amount for one-time in month
  const { data: recurringExpenses } = await supabase
    .from("expenses")
    .select("monthly_share")
    .eq("is_recurring", true)
    .not("monthly_share", "is", null);
  const recurringTotal =
    recurringExpenses?.reduce((s, e) => s + (e.monthly_share ?? 0), 0) ?? 0;

  const { data: oneTimeExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("is_recurring", false)
    .gte("expense_date", start)
    .lte("expense_date", end.slice(0, 10));
  const oneTimeTotal =
    oneTimeExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const expenses = recurringTotal + oneTimeTotal;

  // Recent settlements
  const { data: settlements } = await supabase
    .from("revenue_settlements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Recent expenses
  const { data: expensesList } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          الماليات
        </h1>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="profit" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            أرباح
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <Receipt className="h-4 w-4" />
            إيرادات
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            مصاريف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-4">
          <ProfitSummary
            settledRevenue={settledRevenue}
            cogs={cogs}
            expenses={expenses}
          />
          <p className="text-sm text-muted-foreground">
            الأرقام للشهر الحالي (من {start} إلى {end.slice(0, 10)})
          </p>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <SettlementUpload />
          <Card>
            <CardHeader>
              <CardTitle>آخر التسويات</CardTitle>
            </CardHeader>
            <CardContent>
              {!settlements?.length ? (
                <p className="text-sm text-muted-foreground">
                  لم يتم رفع أي ملف تسوية بعد
                </p>
              ) : (
                <ul className="space-y-2">
                  {settlements.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0"
                    >
                      <span>{s.file_name}</span>
                      <span className="text-muted-foreground">
                        {formatDate(s.upload_date)} — مطابق: {s.matched_count}،
                        غير مطابق: {s.unmatched_count} —{" "}
                        {formatSAR(s.total_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <ExpenseForm />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>سجل المصاريف</CardTitle>
            </CardHeader>
            <CardContent>
              {!expensesList?.length ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد مصاريف مسجّلة
                </p>
              ) : (
                <ul className="space-y-2">
                  {expensesList.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-sm py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <span className="font-medium">{e.description}</span>
                        <span className="text-muted-foreground mr-2">
                          — {e.category}
                        </span>
                        {e.is_recurring && (
                          <span className="text-xs text-muted-foreground">
                            (شهري)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{formatSAR(e.amount)}</span>
                        <span className="text-muted-foreground">
                          {formatDate(e.expense_date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
