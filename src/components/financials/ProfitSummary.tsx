"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSAR } from "@/lib/utils/formatters";

interface ProfitSummaryProps {
  settledRevenue: number;
  cogs: number;
  expenses: number;
  banLosses?: number;
}

export default function ProfitSummary({
  settledRevenue,
  cogs,
  expenses,
  banLosses = 0,
}: ProfitSummaryProps) {
  const profit = useMemo(
    () => settledRevenue - cogs - expenses - banLosses,
    [settledRevenue, cogs, expenses, banLosses]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>ملخص الأرباح (الشهر الحالي)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">إيرادات مسوّاة</span>
          <span className="font-medium text-green-500">
            +{formatSAR(settledRevenue)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">تكلفة البضاعة (COGS)</span>
          <span className="font-medium text-red-500">-{formatSAR(cogs)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">المصاريف</span>
          <span className="font-medium text-red-500">-{formatSAR(expenses)}</span>
        </div>
        {banLosses > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">خسائر الحظر</span>
            <span className="font-medium text-red-500">-{formatSAR(banLosses)}</span>
          </div>
        )}
        <hr className="border-border" />
        <div className="flex justify-between font-semibold text-base">
          <span>صافي الربح</span>
          <span className={profit >= 0 ? "text-green-500" : "text-red-500"}>
            {formatSAR(profit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
