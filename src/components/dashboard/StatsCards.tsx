import { Card, CardContent } from "@/components/ui/card";
import { formatSAR } from "@/lib/utils/formatters";
import { ClipboardList, Wallet, TrendingUp, Package } from "lucide-react";

interface StatsCardsProps {
  ordersCount: number;
  revenue: number;
  ordersCompleted: number;
  ordersPending: number;
}

const iconClass = "h-5 w-5 text-muted-foreground";

export default function StatsCards({
  ordersCount,
  revenue,
  ordersCompleted,
  ordersPending,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              إجمالي الطلبات
            </p>
            <ClipboardList className={iconClass} />
          </div>
          <p className="text-2xl font-bold mt-2">{ordersCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              إيرادات مسوّاة (الشهر)
            </p>
            <Wallet className={iconClass} />
          </div>
          <p className="text-2xl font-bold mt-2">{formatSAR(revenue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              طلبات مكتملة
            </p>
            <Package className={iconClass} />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-500">
            {ordersCompleted}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              طلبات قيد التنفيذ
            </p>
            <TrendingUp className={iconClass} />
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-500">
            {ordersPending}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
