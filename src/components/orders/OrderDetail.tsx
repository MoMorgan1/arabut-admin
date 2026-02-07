"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import { updateOrderItemStatus } from "@/app/(dashboard)/orders/actions";
import {
  ORDER_TYPE_LABELS,
  COINS_STATUSES,
  COINS_STATUS_LABELS,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABELS,
} from "@/lib/utils/constants";
import { formatSAR, formatDate, formatCoins, formatPlatform } from "@/lib/utils/formatters";
import type { Order, OrderItem, OrderStatusLog } from "@/types/database";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface OrderDetailData extends Order {
  order_items: (OrderItem & { status_log: OrderStatusLog[] })[];
}

interface OrderDetailProps {
  order: OrderDetailData;
}

export default function OrderDetail({ order }: OrderDetailProps) {
  return (
    <div className="space-y-6">
      {/* Order header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                طلب #{order.salla_order_id}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(order.order_date)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">العميل</p>
              <p className="font-medium">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="text-sm" dir="ltr">
                  {order.customer_phone_code}
                  {order.customer_phone}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المبلغ الإجمالي</p>
              <p className="font-medium">{formatSAR(order.salla_total_sar)}</p>
              {order.payment_method && (
                <p className="text-sm text-muted-foreground">
                  {order.payment_method}
                </p>
              )}
            </div>
          </div>
          {order.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">ملاحظات الطلب</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">عناصر الطلب</h2>
        {order.order_items.map((item) => (
          <OrderItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function OrderItemCard({
  item,
}: {
  item: OrderItem & { status_log: OrderStatusLog[] };
}) {
  const [updating, setUpdating] = useState(false);
  const isCoins = item.item_type === "coins";
  const statusOptions = isCoins ? COINS_STATUSES : SERVICE_STATUSES;
  const statusLabels = isCoins ? COINS_STATUS_LABELS : SERVICE_STATUS_LABELS;

  const router = useRouter();

  async function handleStatusChange(newStatus: string) {
    setUpdating(true);
    const result = await updateOrderItemStatus(item.id, newStatus);
    setUpdating(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم تحديث الحالة");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {ORDER_TYPE_LABELS[item.item_type] ?? item.item_type}
            </Badge>
            <CardTitle className="text-base">{item.product_name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <Select
              value={item.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className="w-[180px] h-8">
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SelectValue placeholder="تغيير الحالة" />
                )}
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status] ?? status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item details */}
        {(item.coins_amount_k || item.platform) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {item.coins_amount_k != null && (
              <span>
                <span className="text-muted-foreground">الكمية: </span>
                {formatCoins(item.coins_amount_k)}
              </span>
            )}
            {item.platform && (
              <span>
                <span className="text-muted-foreground">المنصة: </span>
                {formatPlatform(item.platform)}
              </span>
            )}
            {item.expected_cost != null && (
              <span>
                <span className="text-muted-foreground">التكلفة المتوقعة: </span>
                {formatSAR(item.expected_cost)}
              </span>
            )}
            {item.actual_cost != null && (
              <span>
                <span className="text-muted-foreground">التكلفة الفعلية: </span>
                {formatSAR(item.actual_cost)}
              </span>
            )}
            {item.ft_order_id && (
              <span className="font-mono text-xs">
                FT: {item.ft_order_id}
              </span>
            )}
          </div>
        )}

        {item.customer_note && (
          <p className="text-sm text-muted-foreground italic">
            ملاحظة للزبون: {item.customer_note}
          </p>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">سجل الحالة</p>
          <StatusTimeline entries={item.status_log} />
        </div>
      </CardContent>
    </Card>
  );
}
