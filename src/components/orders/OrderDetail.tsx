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
  moveOrderToTrashAction,
} from "@/app/(dashboard)/orders/actions";
import { useUserRole } from "@/hooks/useUserRole";
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
  Trash2,
} from "lucide-react";

const TERMINAL_STATUSES = ["completed", "completed_comp", "cancelled", "refunded"];
const POLL_INTERVAL_MS = 5000; // 5 seconds

// FUT Transfer economyStateLong → display config
// These are the values from FT API's economyStateLong field
const FT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Success
  finished: { label: "Finished", color: "text-green-400 bg-green-500/20" },

  // Active / in progress
  "Transfers In Progress": { label: "Transfers In Progress", color: "text-blue-400 bg-blue-500/20" },
  "Partly Delivered": { label: "Partly Delivered", color: "text-blue-400 bg-blue-500/20" },
  transfersInProgress: { label: "Transfers In Progress", color: "text-blue-400 bg-blue-500/20" },
  partlyDelivered: { label: "Partly Delivered", color: "text-blue-400 bg-blue-500/20" },

  // Waiting / queued
  entered: { label: "Entered", color: "text-yellow-400 bg-yellow-500/20" },
  ready: { label: "Ready", color: "text-yellow-400 bg-yellow-500/20" },
  "Waiting for Assignment": { label: "Waiting for Assignment", color: "text-yellow-400 bg-yellow-500/20" },
  waitingForAssignment: { label: "Waiting for Assignment", color: "text-yellow-400 bg-yellow-500/20" },

  // Customer issues (orange/red)
  FailedSessionExpiredCustomerLoggedIn: { label: "Customer Logged In", color: "text-orange-400 bg-orange-500/20" },
  FailedWrongCredentialsTo: { label: "Wrong Credentials", color: "text-red-400 bg-red-500/20" },
  FailedWrongBACodeTo: { label: "Wrong Backup Codes", color: "text-red-400 bg-red-500/20" },
  FailWebAppCustomerLocked: { label: "Web App Locked", color: "text-red-400 bg-red-500/20" },
  FailWebAppNotYetUnlocked: { label: "Web App Not Unlocked", color: "text-red-400 bg-red-500/20" },
  FailedTLfullReceiver: { label: "Transfer List Full", color: "text-orange-400 bg-orange-500/20" },
  FailLoggedInConsoleTo: { label: "Logged In On Console", color: "text-orange-400 bg-orange-500/20" },
  wrongBA: { label: "Wrong Backup Codes", color: "text-red-400 bg-red-500/20" },
  wrongUserPass: { label: "Wrong Email/Password", color: "text-red-400 bg-red-500/20" },
  wrongConsole: { label: "Wrong Platform", color: "text-red-400 bg-red-500/20" },
  noClub: { label: "No Club", color: "text-red-400 bg-red-500/20" },
  tlFull: { label: "Transfer List Full", color: "text-orange-400 bg-orange-500/20" },
  notEnoughCoins: { label: "Not Enough Coins", color: "text-orange-400 bg-orange-500/20" },
  console: { label: "Sign Out From Console", color: "text-orange-400 bg-orange-500/20" },
  noTM: { label: "No Transfer Market", color: "text-red-400 bg-red-500/20" },
  belowMinTransfer: { label: "Below Min Transfer", color: "text-orange-400 bg-orange-500/20" },

  // Generic interrupted
  interrupted: { label: "Interrupted", color: "text-orange-400 bg-orange-500/20" },
};

function FTStatusBadge({ ftStatus }: { ftStatus: string }) {
  const config = FT_STATUS_CONFIG[ftStatus] ?? {
    // For unknown values, display as-is with a neutral style
    label: ftStatus.replace(/([A-Z])/g, " $1").trim(), // "camelCase" → "camel Case"
    color: "text-muted-foreground bg-muted/50",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}
      title={ftStatus}
    >
      {config.label}
    </span>
  );
}

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
  const { role } = useUserRole();
  const allowAdminFields = role !== "supplier";
  const isAdmin = role === "admin";
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);

  // Check if any items are FT-linked and not in terminal status
  const hasFTItems = order.order_items.some((item) => item.ft_order_id);
  const allTerminal = order.order_items.every((item) =>
    TERMINAL_STATUSES.includes(item.status)
  );
  const shouldPoll = hasFTItems && !allTerminal && role !== "supplier";

  const [polling, setPolling] = useState(shouldPoll);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncOrder = useCallback(async () => {
    try {
      console.log(`[FT Sync] Polling order ${order.id}...`);
      const res = await fetch("/api/sync-ft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!res.ok) {
        console.warn(`[FT Sync] API returned ${res.status}`);
        return;
      }

      const data = await res.json();
      console.log("[FT Sync] Response:", data);

      if (data.synced > 0) {
        setLastSync(new Date().toLocaleTimeString());
      }

      // Always refresh to show latest data (costs, delivery progress, etc.)
      router.refresh();

      // Stop polling if all items are now terminal
      const allDone = data.results?.every(
        (r: { newStatus: string }) => TERMINAL_STATUSES.includes(r.newStatus)
      );
      if (allDone && data.synced > 0) {
        console.log("[FT Sync] All items completed — stopping poll");
        setPolling(false);
      }
    } catch (err) {
      console.error("[FT Sync] Poll error:", err);
    }
  }, [order.id, router]);

  useEffect(() => {
    if (role === "supplier") {
      setPolling(false);
    }
    if (!polling) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (!hasFTItems) {
        console.log("[FT Sync] No FT-linked items — polling disabled");
      } else if (allTerminal) {
        console.log("[FT Sync] All items in terminal status — polling disabled");
      }
      return;
    }

    console.log(`[FT Sync] Starting poll every ${POLL_INTERVAL_MS / 1000}s for order ${order.id}`);
    // Run immediately on mount, then every POLL_INTERVAL_MS
    syncOrder();
    pollRef.current = setInterval(syncOrder, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [polling, syncOrder, hasFTItems, allTerminal, order.id]);

  // Update polling state when order data changes (e.g. after router.refresh)
  useEffect(() => {
    const stillActive = hasFTItems && !allTerminal;
    setPolling(stillActive);
  }, [hasFTItems, allTerminal]);

  async function handleMoveToTrash() {
    setTrashLoading(true);
    const result = await moveOrderToTrashAction(order.id);
    setTrashLoading(false);
    setTrashDialogOpen(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Order moved to trash");
    router.push("/orders");
    router.refresh();
  }

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
              {allowAdminFields && <EditOrderDialog order={order} />}
              {isAdmin && (
                <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                      Move to Trash
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Move order to trash?</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <p className="text-sm text-muted-foreground">
                        This order will be removed from the orders list and moved to trash. It will be deleted from the main view but can be restored later from Settings → Trash.
                      </p>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        This action affects the database: the order is marked as deleted and hidden from the list.
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setTrashDialogOpen(false)} disabled={trashLoading}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleMoveToTrash} disabled={trashLoading} className="gap-2">
                          {trashLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Move to Trash
                        </Button>
                      </div>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        {allowAdminFields && (
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
        )}
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
            allowAdminFields={allowAdminFields}
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
  allowAdminFields,
}: {
  item: OrderItem & { status_log: OrderStatusLog[] };
  exchangeRate: number;
  suppliers: Supplier[];
  allowAdminFields: boolean;
}) {
  const [updating, setUpdating] = useState(false);
  const [assigningSupplier, setAssigningSupplier] = useState(false);
  const isCoins = item.item_type === "coins";
  const isSBC = item.item_type === "sbc";
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

  async function handleSupplierChange(newSupplierId: string) {
    setAssigningSupplier(true);
    
    // Calculate cost based on supplier pricing
    let calculatedCost: number | null = null;
    let sbcCoinsCost: number | null = null;
    let sbcServiceCost: number | null = null;
    
    if (newSupplierId !== "none") {
      // Special handling for SBC orders
      if (isSBC) {
        const { calculateSBCCosts } = await import("@/app/(dashboard)/suppliers/pricing-actions");
        const costs = await calculateSBCCosts({
          supplier_id: newSupplierId,
          platform: item.platform ?? "PS",
          coins_amount_k: item.coins_amount_k ?? undefined,
          challenges_count: item.challenges_count ?? undefined,
        });
        sbcCoinsCost = costs.coins_cost;
        sbcServiceCost = costs.service_cost;
        
        // Total for display
        if (sbcCoinsCost && sbcServiceCost) {
          calculatedCost = sbcCoinsCost + sbcServiceCost;
        } else if (sbcCoinsCost) {
          calculatedCost = sbcCoinsCost;
        } else if (sbcServiceCost) {
          calculatedCost = sbcServiceCost;
        }
      } else {
        // Regular cost calculation for non-SBC orders
        const { calculateSupplierCost } = await import("@/app/(dashboard)/suppliers/pricing-actions");
        
        // Map item_type to match pricing system expectations
        const mappedType = item.item_type === "fut" ? "fut_rank" : item.item_type;
        
        calculatedCost = await calculateSupplierCost({
          supplier_id: newSupplierId,
          item_type: mappedType as "coins" | "fut_rank" | "rivals" | "sbc" | "other",
          platform: item.platform ?? "PS",
          coins_amount_k: item.coins_amount_k ?? undefined,
          rank_level: item.rank_target ?? undefined,
          division_level: item.division_target ?? undefined,
          is_fast_service: item.is_fast_service ?? false,
        });
      }
    }
    
    const updatePayload: {
      supplier_id: string | null;
      expected_cost?: number | null;
      sbc_coins_cost?: number | null;
      sbc_service_cost?: number | null;
    } = {
      supplier_id: newSupplierId === "none" ? null : newSupplierId,
    };
    
    if (isSBC) {
      updatePayload.sbc_coins_cost = sbcCoinsCost;
      updatePayload.sbc_service_cost = sbcServiceCost;
    } else {
      updatePayload.expected_cost = calculatedCost;
    }
    
    const result = await updateOrderItemAction(item.id, updatePayload);
    setAssigningSupplier(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    
    const successMsg = calculatedCost 
      ? isSBC 
        ? `Supplier assigned - Total: $${calculatedCost.toFixed(2)} (Coins: $${sbcCoinsCost?.toFixed(2) ?? 0}, Service: $${sbcServiceCost?.toFixed(2) ?? 0})`
        : `Supplier assigned - Expected cost: $${calculatedCost.toFixed(2)}`
      : "Supplier assigned";
    
    toast.success(successMsg);
    router.refresh();
  }

  // Convert USD cost to SAR
  const actualCostSAR =
    item.actual_cost != null ? item.actual_cost * exchangeRate : null;
  const expectedCostSAR =
    item.expected_cost != null ? item.expected_cost * exchangeRate : null;

  // Find supplier name
  const supplierName = suppliers.find((s) => s.id === item.supplier_id)?.display_name;

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
            {isSBC && item.challenges_count && (
              <Badge variant="outline">{item.challenges_count} Challenges</Badge>
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
            {allowAdminFields && !isCoins && (
              <Select
                value={item.supplier_id ?? "none"}
                onValueChange={handleSupplierChange}
                disabled={assigningSupplier}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  {assigningSupplier ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SelectValue placeholder="Assign supplier" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Supplier —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

          {allowAdminFields && !isSBC && expectedCostSAR != null && (
            <div>
              <span className="text-xs text-muted-foreground block">Expected Cost</span>
              <span className="font-medium">{formatSAR(expectedCostSAR)}</span>
              <span className="text-xs text-muted-foreground block">
                ({formatUSD(item.expected_cost)})
              </span>
            </div>
          )}
          {allowAdminFields && !isSBC && actualCostSAR != null && (
            <div>
              <span className="text-xs text-muted-foreground block">Actual Cost</span>
              <span className="font-medium">{formatSAR(actualCostSAR)}</span>
              <span className="text-xs text-muted-foreground block">
                ({formatUSD(item.actual_cost)})
              </span>
            </div>
          )}

          {/* SBC dual costs */}
          {allowAdminFields && isSBC && (
            <>
              {item.sbc_coins_cost != null && (
                <div>
                  <span className="text-xs text-muted-foreground block">Coins Cost</span>
                  <span className="font-medium">{formatSAR(item.sbc_coins_cost * exchangeRate)}</span>
                  <span className="text-xs text-muted-foreground block">
                    ({formatUSD(item.sbc_coins_cost)})
                  </span>
                </div>
              )}
              {item.sbc_service_cost != null && (
                <div>
                  <span className="text-xs text-muted-foreground block">Service Cost</span>
                  <span className="font-medium">{formatSAR(item.sbc_service_cost * exchangeRate)}</span>
                  <span className="text-xs text-muted-foreground block">
                    ({formatUSD(item.sbc_service_cost)})
                  </span>
                </div>
              )}
              {item.sbc_coins_cost != null && item.sbc_service_cost != null && (
                <div>
                  <span className="text-xs text-muted-foreground block">Total Cost</span>
                  <span className="font-medium font-bold">
                    {formatSAR((item.sbc_coins_cost + item.sbc_service_cost) * exchangeRate)}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    ({formatUSD(item.sbc_coins_cost + item.sbc_service_cost)})
                  </span>
                </div>
              )}
            </>
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

          {item.ft_status && (
            <div>
              <span className="text-xs text-muted-foreground block">FT Status</span>
              <FTStatusBadge ftStatus={item.ft_status} />
            </div>
          )}

          {allowAdminFields && supplierName && (
            <div>
              <span className="text-xs text-muted-foreground block">Supplier</span>
              <span className="font-medium">{supplierName}</span>
            </div>
          )}

          {isSBC && item.challenges_count && (
            <div>
              <span className="text-xs text-muted-foreground block">Challenges Count</span>
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
            isSBC={isSBC}
            isCoins={isCoins}
            allowAdminFields={allowAdminFields}
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
  isSBC,
  isCoins,
  allowAdminFields,
}: {
  item: OrderItem;
  suppliers: Supplier[];
  isSBC: boolean;
  isCoins: boolean;
  allowAdminFields: boolean;
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
  const [rankTarget, setRankTarget] = useState(
    item.rank_target != null ? String(item.rank_target) : ""
  );
  const [divisionTarget, setDivisionTarget] = useState(
    item.division_target != null ? String(item.division_target) : ""
  );
  const [isFastService, setIsFastService] = useState(item.is_fast_service ?? false);
  const [sbcCoinsCost, setSbcCoinsCost] = useState(
    item.sbc_coins_cost != null ? String(item.sbc_coins_cost) : ""
  );
  const [sbcServiceCost, setSbcServiceCost] = useState(
    item.sbc_service_cost != null ? String(item.sbc_service_cost) : ""
  );

  async function handleSave() {
    setLoading(true);
    const payload: {
      actual_cost?: number | null;
      expected_cost?: number | null;
      supplier_id?: string | null;
      notes?: string;
      challenges_count?: number | null;
      coins_delivered_k?: number | null;
      rank_target?: number | null;
      division_target?: number | null;
      is_fast_service?: boolean;
      sbc_coins_cost?: number | null;
      sbc_service_cost?: number | null;
    } = {
      notes: itemNotes,
      challenges_count: challengesCount ? parseInt(challengesCount) : null,
      coins_delivered_k: coinsDelivered ? parseFloat(coinsDelivered) : null,
      rank_target: rankTarget ? parseInt(rankTarget) : null,
      division_target: divisionTarget ? parseInt(divisionTarget) : null,
      is_fast_service: isFastService,
    };

    if (allowAdminFields) {
      if (isSBC) {
        payload.sbc_coins_cost = sbcCoinsCost ? parseFloat(sbcCoinsCost) : null;
        payload.sbc_service_cost = sbcServiceCost ? parseFloat(sbcServiceCost) : null;
      } else {
        payload.actual_cost = actualCost ? parseFloat(actualCost) : null;
        payload.expected_cost = expectedCost ? parseFloat(expectedCost) : null;
      }
      payload.supplier_id = supplierId === "none" ? null : supplierId;
    }

    const result = await updateOrderItemAction(item.id, payload);
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
          {allowAdminFields && !isSBC && (
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
          )}

          {/* SBC dual cost inputs */}
          {allowAdminFields && isSBC && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Coins Cost (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sbcCoinsCost}
                    onChange={(e) => setSbcCoinsCost(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost for coins recharge
                  </p>
                </div>
                <div>
                  <Label>Service Cost (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sbcServiceCost}
                    onChange={(e) => setSbcServiceCost(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost for challenge completion
                  </p>
                </div>
              </div>
              {sbcCoinsCost && sbcServiceCost && (
                <div className="bg-muted/50 p-2 rounded text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-bold">
                    ${(parseFloat(sbcCoinsCost) + parseFloat(sbcServiceCost)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

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
          {allowAdminFields && (
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
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Challenges count (for SBC orders) */}
          {isSBC && (
            <div>
              <Label>Challenges Count</Label>
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

          {/* FUT Rank target */}
          {item.item_type === "fut" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Rank (1-6)</Label>
                <Select value={rankTarget} onValueChange={setRankTarget}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    <SelectItem value="1">Rank 1</SelectItem>
                    <SelectItem value="2">Rank 2</SelectItem>
                    <SelectItem value="3">Rank 3</SelectItem>
                    <SelectItem value="4">Rank 4</SelectItem>
                    <SelectItem value="5">Rank 5</SelectItem>
                    <SelectItem value="6">Rank 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFastService}
                    onChange={(e) => setIsFastService(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Fast Service</span>
                </label>
              </div>
            </div>
          )}

          {/* Rivals Division target */}
          {item.item_type === "rivales" && (
            <div>
              <Label>Target Division (1-10)</Label>
              <Select value={divisionTarget} onValueChange={setDivisionTarget}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((div) => (
                    <SelectItem key={div} value={String(div)}>
                      Division {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
