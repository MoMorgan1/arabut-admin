"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import {
  updateOrderItemStatus,
  updateOrderAction,
  updateOrderItemAction,
} from "@/app/(dashboard)/orders/actions";
import {
  ORDER_TYPE_LABELS,
  COINS_STATUSES,
  COINS_STATUS_LABELS,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABELS,
} from "@/lib/utils/constants";
import {
  formatSAR,
  formatDate,
  formatCoins,
  formatPlatform,
  formatUSD,
} from "@/lib/utils/formatters";
import type { Order, OrderItem, OrderStatusLog, Supplier } from "@/types/database";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  DollarSign,
  User,
  Phone,
  CreditCard,
  Radio,
} from "lucide-react";

const TERMINAL_STATUSES = ["completed", "completed_comp", "cancelled", "refunded"];
const POLL_INTERVAL_MS = 5000; // 5 seconds

export interface OrderDetailData extends Order {
  order_items: (OrderItem & { status_log: OrderStatusLog[] })[];
}

interface OrderDetailProps {
  order: OrderDetailData;
  suppliers?: Supplier[];
  globalExchangeRate?: number;
}

export default function OrderDetail({
  order,
  suppliers = [],
  globalExchangeRate = 3.75,
}: OrderDetailProps) {
  const exchangeRate = globalExchangeRate;
  const router = useRouter();

  // Check if any items are FT-linked and not in terminal status
  const hasFTItems = order.order_items.some((item) => item.ft_order_id);
  const allTerminal = order.order_items.every((item) =>
    TERMINAL_STATUSES.includes(item.status)
  );
  const shouldPoll = hasFTItems && !allTerminal;

  const [polling, setPolling] = useState(shouldPoll);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncOrder = useCallback(async () => {
    try {
      const res = await fetch("/api/sync-ft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.synced > 0) {
        setLastSync(new Date().toLocaleTimeString());
        // Check if any status actually changed
        const anyChanged = data.results?.some(
          (r: { statusChanged: boolean }) => r.statusChanged
        );
        if (anyChanged) {
          router.refresh();
        }
      }

      // Stop polling if all items are now terminal
      const allDone = data.results?.every(
        (r: { newStatus: string }) => TERMINAL_STATUSES.includes(r.newStatus)
      );
      if (allDone && data.synced > 0) {
        setPolling(false);
        router.refresh();
      }
    } catch {
      // Silently ignore poll errors to avoid spamming
    }
  }, [order.id, router]);

  useEffect(() => {
    if (!polling) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Run immediately on mount, then every POLL_INTERVAL_MS
    syncOrder();
    pollRef.current = setInterval(syncOrder, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [polling, syncOrder]);

  // Update polling state when order data changes (e.g. after router.refresh)
  useEffect(() => {
    const stillActive = hasFTItems && !allTerminal;
    setPolling(stillActive);
  }, [hasFTItems, allTerminal]);

  return (
    <div className="space-y-6">
      {/* Order header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  Order #{order.salla_order_id}
                </CardTitle>
                {/* Live polling indicator */}
                {polling && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Radio className="h-3 w-3 animate-pulse" />
                    <span>Live</span>
                    {lastSync && (
                      <span className="text-muted-foreground">({lastSync})</span>
                    )}
                  </div>
                )}
                {!polling && hasFTItems && allTerminal && (
                  <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                    All synced
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(order.order_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <EditOrderDialog order={order} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer info */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Customer
              </p>
              <p className="font-medium text-sm">{order.customer_name}</p>
            </div>

            {/* Phone */}
            {order.customer_phone && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="text-sm font-mono">
                  {order.customer_phone_code}{order.customer_phone}
                </p>
              </div>
            )}

            {/* Total */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Total
              </p>
              <p className="font-medium text-sm">{formatSAR(order.salla_total_sar)}</p>
              {order.payment_method && (
                <p className="text-xs text-muted-foreground">
                  {order.payment_method}
                </p>
              )}
            </div>

            {/* Exchange rate */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Exchange Rate
              </p>
              <p className="text-sm font-mono">
                1 USD = {exchangeRate} SAR
              </p>
            </div>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Order Notes</p>
                <p className="text-sm mt-1">{order.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Order Items</h2>
        {order.order_items.map((item) => (
          <OrderItemCard
            key={item.id}
            item={item}
            exchangeRate={exchangeRate}
            suppliers={suppliers}
          />
        ))}
      </div>
    </div>
  );
}

function OrderItemCard({
  item,
  exchangeRate,
  suppliers,
}: {
  item: OrderItem & { status_log: OrderStatusLog[] };
  exchangeRate: number;
  suppliers: Supplier[];
}) {
  const [updating, setUpdating] = useState(false);
  const isCoins = item.item_type === "coins";
  const isChallenges = item.item_type === "challenges";
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
    toast.success("Status updated");
    router.refresh();
  }

  // Convert USD cost to SAR
  const actualCostSAR =
    item.actual_cost != null ? item.actual_cost * exchangeRate : null;
  const expectedCostSAR =
    item.expected_cost != null ? item.expected_cost * exchangeRate : null;

  // Find supplier name
  const supplierName = suppliers.find((s) => s.id === item.supplier_id)?.name;

  // Coins delivery progress
  const coinsTotal = item.coins_amount_k ?? 0;
  const coinsDelivered = (item as OrderItem & { coins_delivered_k?: number }).coins_delivered_k ?? 0;
  const coinsProgress = coinsTotal > 0 ? Math.min((coinsDelivered / coinsTotal) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {ORDER_TYPE_LABELS[item.item_type] ?? item.item_type}
            </Badge>
            <CardTitle className="text-base">{item.product_name}</CardTitle>
            {isChallenges && item.challenges_count && (
              <Badge variant="outline">{item.challenges_count} challenges</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <Select
              value={item.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className="w-[170px] h-8 text-xs">
                {updating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SelectValue placeholder="Change status" />
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
        {/* Coins delivery progress */}
        {isCoins && coinsTotal > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Delivery Progress</p>
              <p className="text-xs font-mono text-muted-foreground">
                {formatCoins(coinsDelivered)} / {formatCoins(coinsTotal)}
              </p>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  coinsProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${coinsProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {coinsProgress.toFixed(0)}% delivered
            </p>
          </div>
        )}

        {/* EA Credentials box */}
        {item.ea_email && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">EA Account Credentials</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="font-mono select-all">{item.ea_email}</span>
              </div>
              {item.ea_password && (
                <div>
                  <span className="text-xs text-muted-foreground block">Password</span>
                  <span className="font-mono select-all">{item.ea_password}</span>
                </div>
              )}
              {(item.backup_code_1 || item.backup_code_2 || item.backup_code_3) && (
                <div>
                  <span className="text-xs text-muted-foreground block">Backup Codes</span>
                  <span className="font-mono select-all">
                    {[item.backup_code_1, item.backup_code_2, item.backup_code_3]
                      .filter(Boolean)
                      .join(" / ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          {item.coins_amount_k != null && (
            <div>
              <span className="text-xs text-muted-foreground block">Quantity</span>
              <span className="font-medium">{formatCoins(item.coins_amount_k)}</span>
            </div>
          )}
          {item.platform && (
            <div>
              <span className="text-xs text-muted-foreground block">Platform</span>
              <span className="font-medium">{formatPlatform(item.platform)}</span>
            </div>
          )}
          {item.shipping_type && (
            <div>
              <span className="text-xs text-muted-foreground block">Shipping</span>
              <span className="font-medium">
                {item.shipping_type === "fast" ? "Fast" : "Slow"}
              </span>
            </div>
          )}

          {expectedCostSAR != null && (
            <div>
              <span className="text-xs text-muted-foreground block">Expected Cost</span>
              <span className="font-medium">{formatSAR(expectedCostSAR)}</span>
              <span className="text-xs text-muted-foreground block">
                ({formatUSD(item.expected_cost)})
              </span>
            </div>
          )}
          {actualCostSAR != null && (
            <div>
              <span className="text-xs text-muted-foreground block">Actual Cost</span>
              <span className="font-medium">{formatSAR(actualCostSAR)}</span>
              <span className="text-xs text-muted-foreground block">
                ({formatUSD(item.actual_cost)})
              </span>
            </div>
          )}

          {item.ft_order_id && (
            <div>
              <span className="text-xs text-muted-foreground block">FUT Transfer ID</span>
              <span className="font-mono text-xs">{item.ft_order_id}</span>
              {item.ft_last_synced && (
                <span className="text-xs text-muted-foreground block">
                  Last sync: {formatDate(item.ft_last_synced)}
                </span>
              )}
            </div>
          )}

          {supplierName && (
            <div>
              <span className="text-xs text-muted-foreground block">Supplier</span>
              <span className="font-medium">{supplierName}</span>
            </div>
          )}

          {isChallenges && item.challenges_count && (
            <div>
              <span className="text-xs text-muted-foreground block">Challenge Count</span>
              <span className="font-medium">{item.challenges_count}</span>
            </div>
          )}
        </div>

        {item.customer_note && (
          <p className="text-sm text-muted-foreground italic">
            Customer note: {item.customer_note}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <EditOrderItemDialog
            item={item}
            suppliers={suppliers}
            isChallenges={isChallenges}
            isCoins={isCoins}
          />
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Status History</p>
          <StatusTimeline entries={item.status_log} />
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Edit Order Dialog (for order header) =====
function EditOrderDialog({ order }: { order: Order }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone ?? "");
  const [totalSar, setTotalSar] = useState(
    order.salla_total_sar ? String(order.salla_total_sar) : ""
  );
  const [notes, setNotes] = useState(order.notes ?? "");

  async function handleSave() {
    setLoading(true);
    const result = await updateOrderAction(order.id, {
      customer_name: customerName,
      customer_phone: customerPhone,
      salla_total_sar: totalSar ? parseFloat(totalSar) : null,
      notes,
    });
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Order updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Order #{order.salla_order_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Customer Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Total (SAR)</Label>
            <Input
              type="number"
              step="0.01"
              value={totalSar}
              onChange={(e) => setTotalSar(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || !customerName.trim()}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Edit Order Item Dialog =====
function EditOrderItemDialog({
  item,
  suppliers,
  isChallenges,
  isCoins,
}: {
  item: OrderItem;
  suppliers: Supplier[];
  isChallenges: boolean;
  isCoins: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actualCost, setActualCost] = useState(
    item.actual_cost != null ? String(item.actual_cost) : ""
  );
  const [expectedCost, setExpectedCost] = useState(
    item.expected_cost != null ? String(item.expected_cost) : ""
  );
  const [supplierId, setSupplierId] = useState(item.supplier_id ?? "none");
  const [itemNotes, setItemNotes] = useState(item.notes ?? "");
  const [challengesCount, setChallengesCount] = useState(
    item.challenges_count != null ? String(item.challenges_count) : ""
  );
  const [coinsDelivered, setCoinsDelivered] = useState(
    (item as OrderItem & { coins_delivered_k?: number }).coins_delivered_k != null
      ? String((item as OrderItem & { coins_delivered_k?: number }).coins_delivered_k)
      : ""
  );

  async function handleSave() {
    setLoading(true);
    const result = await updateOrderItemAction(item.id, {
      actual_cost: actualCost ? parseFloat(actualCost) : null,
      expected_cost: expectedCost ? parseFloat(expectedCost) : null,
      supplier_id: supplierId === "none" ? null : supplierId,
      notes: itemNotes,
      challenges_count: challengesCount ? parseInt(challengesCount) : null,
      coins_delivered_k: coinsDelivered ? parseFloat(coinsDelivered) : null,
    });
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Item updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Edit Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {item.product_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expected Cost (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={expectedCost}
                onChange={(e) => setExpectedCost(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Actual Cost (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          {/* Coins delivered */}
          {isCoins && item.coins_amount_k != null && (
            <div>
              <Label>Coins Delivered (K)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max={String(item.coins_amount_k)}
                value={coinsDelivered}
                onChange={(e) => setCoinsDelivered(e.target.value)}
                placeholder={`Max: ${item.coins_amount_k}K`}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatCoins(item.coins_amount_k)}
              </p>
            </div>
          )}

          {/* Supplier selection */}
          <div>
            <Label>Assign Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No Supplier —</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Challenges count */}
          {isChallenges && (
            <div>
              <Label>Challenge Count</Label>
              <Input
                type="number"
                min="1"
                value={challengesCount}
                onChange={(e) => setChallengesCount(e.target.value)}
                placeholder="e.g. 4"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label>Item Notes</Label>
            <Input
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Internal note..."
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
