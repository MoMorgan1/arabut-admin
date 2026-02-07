import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatSAR } from "@/lib/utils/formatters";
import TransactionLog from "@/components/suppliers/TransactionLog";
import EditSupplierForm from "@/components/suppliers/EditSupplierForm";
import AddTransactionForm from "@/components/suppliers/AddTransactionForm";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/suppliers" className="gap-1">
            <ArrowRight className="h-4 w-4" />
            العودة للموردين
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{supplier.name}</CardTitle>
              {supplier.contact_info && (
                <p className="text-sm text-muted-foreground mt-1">
                  {supplier.contact_info}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!supplier.is_active && (
                <Badge variant="secondary">غير نشط</Badge>
              )}
              <span className="text-2xl font-bold">
                {formatSAR(supplier.balance)}
              </span>
              <span className="text-sm text-muted-foreground">الرصيد</span>
              <EditSupplierForm supplier={supplier} />
              <AddTransactionForm supplierId={supplier.id} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionLog transactions={transactions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
