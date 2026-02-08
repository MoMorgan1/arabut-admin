import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionLog from "@/components/suppliers/TransactionLog";
import { formatUSD } from "@/lib/utils/formatters";

export default async function BalancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Balance</h1>
        <p className="text-sm text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, name, balance")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("supplier_transactions")
    .select("*")
    .eq("supplier_id", supplier?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance</h1>
        <p className="text-sm text-muted-foreground">Your current balance and transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {formatUSD(supplier?.balance ?? 0)}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Transactions</h2>
        <TransactionLog transactions={transactions ?? []} />
      </div>
    </div>
  );
}
