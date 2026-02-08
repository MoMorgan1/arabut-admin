"use client";

import { useRouter } from "next/navigation";
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

export interface OrderRowData extends Order {
  order_items: OrderItem[];
}

interface OrdersTableProps {
  orders: OrderRowData[];
  selectedOrderIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  allowSelection?: boolean;
}

export default function OrdersTable({
  orders,
  selectedOrderIds,
  onSelectionChange,
  onSelectAll,
  allowSelection = true,
}: OrdersTableProps) {
  const router = useRouter();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-base font-medium">No orders found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search</p>
      </div>
    );
  }

  const allSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id));

  return (
    <div className="rounded-lg border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            {allowSelection && (
              <TableHead className="w-[44px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(c) => onSelectAll(!!c)}
                />
              </TableHead>
            )}
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>EA Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Qty / Delivered</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const itemCount = order.order_items?.length ?? 0;
            const itemTypes = [...new Set(order.order_items.map((i) => i.item_type))];
            const coinsItems = order.order_items.filter((i) => i.item_type === "coins");
            const totalCoinsK = coinsItems.reduce((sum, i) => sum + (i.coins_amount_k ?? 0), 0);
            const totalDeliveredK = coinsItems.reduce((sum, i) => sum + (i.coins_delivered_k ?? 0), 0);
            const hasDelivery = totalCoinsK > 0 && coinsItems.some((i) => i.coins_delivered_k != null && i.coins_delivered_k > 0);
            const deliveryPct = totalCoinsK > 0 ? Math.min(100, Math.round((totalDeliveredK / totalCoinsK) * 100)) : 0;

            // Get EA emails from order items (deduplicated)
            const eaEmails = [...new Set(
              order.order_items
                .map((i) => i.ea_email)
                .filter((e): e is string => !!e)
            )];

            // Show all unique item statuses
            const uniqueStatuses = [...new Set(order.order_items.map((i) => i.status))];

            return (
              <TableRow
                key={order.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                {allowSelection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(c) => onSelectionChange(order.id, !!c)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-sm">
                  #{order.salla_order_id}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-muted-foreground">
                        {order.customer_phone_code}
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {eaEmails.length > 0 ? (
                    <div className="space-y-0.5">
                      {eaEmails.map((email) => (
                        <p key={email} className="text-xs font-mono text-muted-foreground truncate max-w-[180px]" title={email}>
                          {email}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {itemTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {ORDER_TYPE_LABELS[type] ?? type}
                      </Badge>
                    ))}
                    {itemCount > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {itemCount} items
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {totalCoinsK > 0 ? (
                    <div className="space-y-1">
                      <span>{formatCoins(totalCoinsK)}</span>
                      {hasDelivery && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                deliveryPct >= 100
                                  ? "bg-emerald-500"
                                  : deliveryPct > 0
                                  ? "bg-blue-500"
                                  : "bg-muted"
                              }`}
                              style={{ width: `${deliveryPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatCoins(totalDeliveredK)} ({deliveryPct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">{formatSAR(order.salla_total_sar)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {uniqueStatuses.map((status) => (
                      <StatusBadge key={status} status={status} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(order.order_date)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
