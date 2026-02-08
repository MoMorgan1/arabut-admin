import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import SupplierPricingGrid from "@/components/suppliers/SupplierPricingGrid";

export default async function SupplierPricingPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only suppliers can access this page
  if (profile?.role !== "supplier") {
    redirect("/");
  }

  // Get supplier record
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, display_name")
    .eq("user_id", user.id)
    .single();

  if (!supplier) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Pricing</h1>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Supplier account not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get pricing for this supplier
  const { data: prices } = await supabase
    .from("supplier_prices")
    .select("*")
    .eq("supplier_id", supplier.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Pricing</h1>
        <p className="text-muted-foreground mt-1">
          Set your prices for each service type and platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Price List
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {supplier.display_name}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SupplierPricingGrid supplierId={supplier.id} existingPrices={prices || []} />
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Service Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Coins (price per million):</p>
            <p className="text-muted-foreground">
              Example: If you enter $15, a 100K order will cost $1.50
            </p>
          </div>
          <div>
            <p className="font-medium">FUT Rank (Rank 1-6):</p>
            <p className="text-muted-foreground">
              Set price for each rank. Fast service option available for premium pricing.
            </p>
          </div>
          <div>
            <p className="font-medium">Rivals (Division 1-10):</p>
            <p className="text-muted-foreground">
              Set price for each division
            </p>
          </div>
          <div>
            <p className="font-medium">SBC - Service (per challenge):</p>
            <p className="text-muted-foreground">
              Example: If you enter $5, completing 4 challenges will cost $20
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="font-medium text-blue-700 dark:text-blue-500 mb-1">
              💡 Note
            </p>
            <p className="text-muted-foreground">
              Coins pricing applies to both regular coins orders AND SBC coins cost
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
