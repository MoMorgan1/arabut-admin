import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, DollarSign, Key, Database, Trash2 } from "lucide-react";
import DataMigrationUpload from "@/components/settings/DataMigrationUpload";
import ExchangeRateSetting from "@/components/settings/ExchangeRateSetting";
import PricingRuleForm from "@/components/settings/PricingRuleForm";
import PricingRuleActions from "@/components/settings/PricingRuleActions";
import InviteUserForm from "@/components/settings/InviteUserForm";
import UserActions from "@/components/settings/UserActions";
import LinkSupplierAccount from "@/components/settings/LinkSupplierAccount";
import TrashOrdersList from "@/components/settings/TrashOrdersList";

export default async function SettingsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: pricingRules } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("platform")
    .order("min_amount_k");

  const { data: profiles } = await adminSupabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("full_name");

  const { data: suppliers } = await adminSupabase
    .from("suppliers")
    .select("id, display_name, user_id")
    .order("display_name");

  // Use admin client to bypass RLS — ensures we always read the actual saved value
  const { data: exchangeRateSetting } = await adminSupabase
    .from("system_settings")
    .select("value")
    .eq("key", "exchange_rate")
    .single();

  const exchangeRate = exchangeRateSetting?.value ?? "3.75";

  // Fetch deleted orders (admin only)
  const { data: deletedOrders } = await adminSupabase
    .from("deleted_orders")
    .select(`
      *,
      deleted_order_items (*)
    `)
    .order("deleted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1">
          <TabsTrigger value="pricing" className="gap-1 sm:gap-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1 sm:gap-2">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Users</span>
          </TabsTrigger>
          <TabsTrigger value="trash" className="gap-1 sm:gap-2">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Trash</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-1 sm:gap-2">
            <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Migration</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1 sm:gap-2">
            <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">API</span>
          </TabsTrigger>
        </TabsList>

        {/* =================== Pricing Rules =================== */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Rate</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                USD to SAR exchange rate — used for cost calculations across all orders
              </p>
            </CardHeader>
            <CardContent>
              <ExchangeRateSetting currentRate={exchangeRate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <CardTitle>Pricing Rules (Coins)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Price per million USD by platform, shipping type, and quantity range
                </p>
              </div>
              <PricingRuleForm />
            </CardHeader>
            <CardContent>
              {!pricingRules?.length ? (
                <p className="text-sm text-muted-foreground">No rules yet. Click &ldquo;Add Rule&rdquo; to create one.</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-lg border border-border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Platform</TableHead>
                          <TableHead>Shipping</TableHead>
                          <TableHead>From (K)</TableHead>
                          <TableHead>To (K)</TableHead>
                          <TableHead>$/Million</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingRules.map((r) => (
                          <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                            <TableCell>{r.platform}</TableCell>
                            <TableCell>{r.shipping_type === "fast" ? "Fast" : "Slow"}</TableCell>
                            <TableCell>{r.min_amount_k}</TableCell>
                            <TableCell>{r.max_amount_k ?? "∞"}</TableCell>
                            <TableCell className="font-mono">${r.price_per_million_usd}</TableCell>
                            <TableCell>
                              <Badge variant={r.is_active ? "default" : "secondary"}>
                                {r.is_active ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <PricingRuleActions rule={r} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {pricingRules.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-lg border border-border bg-card p-4 ${!r.is_active ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-base">{r.platform}</p>
                            <p className="text-sm text-muted-foreground">{r.shipping_type === "fast" ? "Fast Shipping" : "Slow Shipping"}</p>
                          </div>
                          <Badge variant={r.is_active ? "default" : "secondary"}>
                            {r.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Range</p>
                            <p className="text-sm font-medium">{r.min_amount_k}K - {r.max_amount_k ? `${r.max_amount_k}K` : "∞"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price/Million</p>
                            <p className="text-sm font-mono font-semibold">${r.price_per_million_usd}</p>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-border">
                          <PricingRuleActions rule={r} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== Trash (Deleted Orders) =================== */}
        <TabsContent value="trash" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Orders</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Orders that have been moved to trash. You can restore or permanently delete them.
              </p>
            </CardHeader>
            <CardContent>
              <TrashOrdersList deletedOrders={deletedOrders ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== User Management =================== */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <CardTitle>Users</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Create accounts, change roles, and manage user access
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <LinkSupplierAccount suppliers={suppliers ?? []} />
                <InviteUserForm />
              </div>
            </CardHeader>
            <CardContent>
              {!profiles?.length ? (
                <p className="text-sm text-muted-foreground">No users found</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-lg border border-border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {p.role === "admin" ? "Admin" : p.role === "employee" ? "Employee" : "Supplier"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.is_active ? (
                                <span className="text-green-500 text-sm">Active</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">Disabled</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <UserActions userId={p.id} currentRole={p.role} isActive={p.is_active} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {profiles.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-base">{p.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {p.role === "admin" ? "Admin" : p.role === "employee" ? "Employee" : "Supplier"}
                              </Badge>
                              {p.is_active ? (
                                <span className="text-green-500 text-xs">Active</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Disabled</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-border">
                          <UserActions userId={p.id} currentRole={p.role} isActive={p.is_active} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== Data Migration =================== */}
        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Migration (Google Sheets or JSON)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a CSV (from Google Sheets) or JSON file. Duplicate orders (same salla_order_id) are skipped.
              </p>
            </CardHeader>
            <CardContent>
              <DataMigrationUpload />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== API Settings =================== */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                FUT Transfer, Salla, and Cron — managed via environment variables (Vercel / .env.local)
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>FUT Transfer:</strong> FT_API_USER, FT_API_KEY</p>
              <p><strong>Salla Webhook:</strong> POST to /api/webhooks/salla</p>
              <p><strong>Cron:</strong> CRON_SECRET (for /api/cron/sync-ft)</p>
              <p className="text-muted-foreground pt-2">
                API keys are not displayed in the web app. Use the Vercel dashboard or .env.local file to edit.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
