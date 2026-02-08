import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, DollarSign, History } from "lucide-react";
import { formatUSD } from "@/lib/utils/formatters";
import TransactionLog from "@/components/suppliers/TransactionLog";
import EditSupplierForm from "@/components/suppliers/EditSupplierForm";
import AddTransactionForm from "@/components/suppliers/AddTransactionForm";
import SupplierPricingGrid from "@/components/suppliers/SupplierPricingGrid";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !supplier) notFound();

  const { data: transactions } = await supabase
    .from("supplier_transactions")
    .select("*")
    .eq("supplier_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: prices } = await supabase
    .from("supplier_prices")
    .select("*")
    .eq("supplier_id", id)
    .order("service_type")
    .order("platform");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/suppliers" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{supplier.display_name}</CardTitle>
              {supplier.contact_info && (
                <p className="text-sm text-muted-foreground mt-1">
                  {supplier.contact_info}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!supplier.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <span className="text-2xl font-bold">
                {formatUSD(supplier.balance)}
              </span>
              <span className="text-sm text-muted-foreground">Balance</span>
              <EditSupplierForm supplier={supplier} />
              <AddTransactionForm supplierId={supplier.id} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <History className="h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <SupplierPricingGrid
                supplierId={supplier.id}
                existingPrices={prices ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Log</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionLog transactions={transactions ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
