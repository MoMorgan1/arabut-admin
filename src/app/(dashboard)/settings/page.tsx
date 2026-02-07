import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, DollarSign, Key, Database } from "lucide-react";
import DataMigrationUpload from "@/components/settings/DataMigrationUpload";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: pricingRules } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("is_active", true)
    .order("platform")
    .order("min_amount_k");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("full_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">الإعدادات</h1>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            قواعد التسعير
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2">
            <Database className="h-4 w-4" />
            ترحيل البيانات
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قواعد التسعير (كوينز)</CardTitle>
              <p className="text-sm text-muted-foreground">
                سعر المليون دولار حسب المنصة ونوع الشحن والكمية — للتعديل من Supabase
              </p>
            </CardHeader>
            <CardContent>
              {!pricingRules?.length ? (
                <p className="text-sm text-muted-foreground">لا توجد قواعد نشطة</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">المنصة</TableHead>
                        <TableHead className="text-right">نوع الشحن</TableHead>
                        <TableHead className="text-right">من (K)</TableHead>
                        <TableHead className="text-right">إلى (K)</TableHead>
                        <TableHead className="text-right">$/مليون</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingRules.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.platform}</TableCell>
                          <TableCell>{r.shipping_type === "fast" ? "سريع" : "بطيء"}</TableCell>
                          <TableCell>{r.min_amount_k}</TableCell>
                          <TableCell>{r.max_amount_k ?? "—"}</TableCell>
                          <TableCell>${r.price_per_million_usd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المستخدمين</CardTitle>
              <p className="text-sm text-muted-foreground">
                إدارة الحسابات من لوحة Supabase → Authentication → Users
              </p>
            </CardHeader>
            <CardContent>
              {!profiles?.length ? (
                <p className="text-sm text-muted-foreground">لا يوجد مستخدمين</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">الدور</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.is_active ? (
                              <span className="text-green-500">نشط</span>
                            ) : (
                              <span className="text-muted-foreground">غير نشط</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ترحيل بيانات (فبراير أو قديمة)</CardTitle>
              <p className="text-sm text-muted-foreground">
                رفع ملف JSON يحتوي مصفوفة orders مع عناصرها. الطلبات المكررة (نفس salla_order_id) تُتخطى.
              </p>
            </CardHeader>
            <CardContent>
              <DataMigrationUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات API</CardTitle>
              <p className="text-sm text-muted-foreground">
                FUT Transfer و Salla و Cron — تُدار عبر متغيرات البيئة (Vercel / .env.local)
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>FUT Transfer:</strong> FT_API_USER, FT_API_KEY</p>
              <p><strong>Salla Webhook:</strong> SALLA_WEBHOOK_SECRET</p>
              <p><strong>Cron:</strong> CRON_SECRET (لـ /api/cron/sync-ft)</p>
              <p className="text-muted-foreground pt-2">
                لا تعرض تطبيقات الويب مفاتيح API. للتعديل استخدم لوحة Vercel أو ملف .env.local محلياً.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
