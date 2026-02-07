"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "./StatusBadge";
import { ORDER_TYPE_LABELS } from "@/lib/utils/constants";
import { formatSAR, formatDate, formatCoins } from "@/lib/utils/formatters";
import type { Order, OrderItem } from "@/types/database";
import { ExternalLink } from "lucide-react";

export interface OrderRowData extends Order {
  order_items: OrderItem[];
}

interface OrdersTableProps {
  orders: OrderRowData[];
  selectedOrderIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export default function OrdersTable({
  orders,
  selectedOrderIds,
  onSelectionChange,
  onSelectAll,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">لا توجد طلبات</p>
        <p className="text-sm">جرّب تغيير الفلاتر أو البحث</p>
      </div>
    );
  }

  const allSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id));

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[44px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => onSelectAll(!!c)}
              />
            </TableHead>
            <TableHead className="text-right">رقم الطلب</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">الكمية</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            // Determine display info from items
            const firstItem = order.order_items[0];
            const itemCount = order.order_items.length;
            const itemTypes = [...new Set(order.order_items.map((i) => i.item_type))];
            const totalCoinsK = order.order_items
              .filter((i) => i.item_type === "coins")
              .reduce((sum, i) => sum + (i.coins_amount_k ?? 0), 0);

            return (
              <TableRow key={order.id} className="hover:bg-muted/30">
                <TableCell>
                  <Checkbox
                    checked={selectedOrderIds.has(order.id)}
                    onCheckedChange={(c) => onSelectionChange(order.id, !!c)}
                  />
                </TableCell>
                {/* Order ID */}
                <TableCell className="font-mono text-sm">
                  #{order.salla_order_id}
                </TableCell>

                {/* Customer */}
                <TableCell>
                  <div>
                    <p className="font-medium">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {order.customer_phone_code}
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {itemTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {ORDER_TYPE_LABELS[type] ?? type}
                      </Badge>
                    ))}
                    {itemCount > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {itemCount} عناصر
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell>
                  {totalCoinsK > 0 ? formatCoins(totalCoinsK) : "—"}
                </TableCell>

                {/* Total SAR */}
                <TableCell>{formatSAR(order.salla_total_sar)}</TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={firstItem?.status ?? order.status} />
                </TableCell>

                {/* Date */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(order.order_date)}
                </TableCell>

                {/* Link */}
                <TableCell>
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
