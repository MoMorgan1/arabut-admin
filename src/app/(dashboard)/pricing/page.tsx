import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, DollarSign } from "lucide-react";
import SupplierPricingGrid from "@/components/suppliers/SupplierPricingGrid";
import DefaultPricingManager from "@/components/suppliers/DefaultPricingManager";

export default async function PricingSettingsPage() {
  const supabase = await createClient();

  // Get default pricing
  const { data: defaultPrices } = await supabase
    .from("default_supplier_prices")
    .select("*")
    .order("service_type")
    .order("platform");

  // Get all active suppliers for the copy action
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Default Pricing</h1>
          <p className="text-muted-foreground mt-1">
            Set default pricing rules that can be copied to all suppliers
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Default Pricing Rules
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These prices will be used as the template when copying to suppliers
            </p>
          </div>
          {suppliers && suppliers.length > 0 && (
            <DefaultPricingManager suppliers={suppliers} />
          )}
        </CardHeader>
        <CardContent>
          <SupplierPricingGrid
            supplierId="default"
            existingPrices={defaultPrices ?? []}
            isDefault={true}
          />
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">1. Set Up Default Pricing:</p>
            <p className="text-muted-foreground">
              Add pricing rules above (e.g., Coins $15/M, FUT Rank 3 $50, etc.)
            </p>
          </div>
          <div>
            <p className="font-medium mb-2">2. Copy to All Suppliers:</p>
            <p className="text-muted-foreground">
              Click "Copy Pricing to All Suppliers" to apply these rules to all {suppliers?.length || 0} suppliers
            </p>
          </div>
          <div>
            <p className="font-medium mb-2">3. Customize Per Supplier:</p>
            <p className="text-muted-foreground">
              Each supplier can then have their pricing adjusted individually on their detail page
            </p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="font-medium text-yellow-700 dark:text-yellow-500 mb-1">
              ⚠️ Note
            </p>
            <p className="text-muted-foreground">
              Copying to all suppliers will <strong>overwrite</strong> their existing pricing. 
              Make sure your default pricing is correct before copying.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
