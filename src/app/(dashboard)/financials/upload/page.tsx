import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import SettlementUpload from "@/components/financials/SettlementUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancialsUploadPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/financials" className="gap-1">
            <ArrowRight className="h-4 w-4" />
            العودة للماليات
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>رفع ملف تسوية سلة</CardTitle>
          <p className="text-sm text-muted-foreground">
            ملف Excel بعمودين: رقم الطلب (order_id) والمبلغ بعد الضريبة (amount).
            سيتم مطابقة الطلبات وتحديث settled_amount.
          </p>
        </CardHeader>
        <CardContent>
          <SettlementUpload />
        </CardContent>
      </Card>
    </div>
  );
}
