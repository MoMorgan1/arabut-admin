import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SettlementUpload from "@/components/financials/SettlementUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancialsUploadPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/financials" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Financials
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload Salla Settlement File</CardTitle>
          <p className="text-sm text-muted-foreground">
            Excel file with two columns: order ID (order_id) and amount after tax (amount).
            Orders will be matched and settled_amount will be updated.
          </p>
        </CardHeader>
        <CardContent>
          <SettlementUpload />
        </CardContent>
      </Card>
    </div>
  );
}
