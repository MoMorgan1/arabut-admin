"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import OrdersTable, { type OrderRowData } from "@/components/orders/OrdersTable";
import OrdersTableSkeleton from "@/components/orders/OrdersTableSkeleton";
import OrderFilters from "@/components/orders/OrderFilters";
import BulkStatusAction from "@/components/orders/BulkStatusAction";
import { DEFAULT_FILTERS, TERMINAL_STATUSES, type OrderFilters as OrderFiltersType } from "@/types/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ClipboardList, Radio, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package } from "lucide-react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 5000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const STORAGE_KEY_PAGE_SIZE = "arabut-orders-page-size";
const ORDER_FETCH_LIMIT = 2000; // Cap for fast initial load; pagination is client-side

function getStoredPageSize(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const stored = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
  const n = stored ? parseInt(stored, 10) : NaN;
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrderFiltersType>(DEFAULT_FILTERS);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "employee" | "supplier" | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Restore page size from localStorage after mount
  useEffect(() => {
    setPageSize(getStoredPageSize());
  }, []);

  const setPageSizeAndStore = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PAGE_SIZE, String(size));
    }
  }, []);

  // Stable supabase client (singleton)
  const supabase = useMemo(() => createClient(), []);

  // Keep a ref to the latest filters so polling always reads current values
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Pagination: slice orders for current page
  const totalOrders = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const safePage = Math.min(page, totalPages) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, safePage, pageSize]);

  // Keep page in bounds when orders or pageSize change
  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [totalPages, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  function handleSelectionChange(id: string, checked: boolean) {
    if (role === "supplier") return;
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (role === "supplier") return;
    // Select/deselect only orders on the current page
    const pageOrderIds = paginatedOrders.map((o) => o.id);
    if (checked) {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        pageOrderIds.forEach((id) => next.add(id));
        return next;
      });
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        pageOrderIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  // Core fetch logic — reads filters from ref (never stale)
  const fetchOrdersCore = useCallback(async (showLoading: boolean) => {
    const currentFilters = filtersRef.current;

    if (showLoading) {
      setLoading(true);
      setRoleError(null);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRoleError("Not signed in. Please log in first.");
        setOrders([]);
        if (showLoading) setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setRoleError(
          "Your account is not linked to a profile in the database. " +
          "Make sure you ran supabase-schema.sql in the SQL Editor, " +
          "or run:\n" +
          `INSERT INTO profiles (id, full_name, role) VALUES ('${user.id}', '${user.email}', 'admin');`
        );
        setOrders([]);
        if (showLoading) setLoading(false);
        return;
      }

      setRole(profile.role);

      if (!["admin", "employee", "supplier"].includes(profile.role)) {
        setRoleError(
          `Your account role is "${profile.role}" — needs to be admin or employee to view orders. ` +
          `Run in SQL Editor:\nUPDATE profiles SET role = 'admin' WHERE id = '${user.id}';`
        );
        setOrders([]);
        if (showLoading) setLoading(false);
        return;
      }

      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("order_date", { ascending: false })
        .limit(ORDER_FETCH_LIMIT);

      // Note: search filtering is done client-side below to avoid
      // bigint type errors with salla_order_id and to also search ea_email

      if (currentFilters.dateFrom) {
        query = query.gte("order_date", currentFilters.dateFrom);
      }
      if (currentFilters.dateTo) {
        query = query.lte("order_date", `${currentFilters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        if (showLoading) toast.error("Error fetching orders: " + error.message);
        return;
      }

      let filteredOrders = (data as OrderRowData[]) ?? [];

      // Client-side search: match customer_name, salla_order_id, and ea_email
      if (currentFilters.search) {
        const q = currentFilters.search.toLowerCase();
        filteredOrders = filteredOrders.filter((order) => {
          const nameMatch = order.customer_name?.toLowerCase().includes(q);
          const orderIdMatch = order.salla_order_id?.toString().includes(q);
          const emailMatch = order.order_items?.some(
            (item) => item.ea_email?.toLowerCase().includes(q)
          );
          return nameMatch || orderIdMatch || emailMatch;
        });
      }

      if (currentFilters.status === "active") {
        filteredOrders = filteredOrders.filter((order) => {
          const items = order.order_items ?? [];
          if (items.length === 0) return true;
          return !items.every((item) => TERMINAL_STATUSES.includes(item.status));
        });
      } else if (currentFilters.status !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items?.some((item) => item.status === currentFilters.status)
        );
      }

      if (currentFilters.itemType !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items?.some((item) => item.item_type === currentFilters.itemType)
        );
      }

      setOrders(filteredOrders);
    } catch (err) {
      console.error("Unexpected error:", err);
      if (showLoading) toast.error("An unexpected error occurred");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [supabase]); // Stable — no filters dependency, reads from ref

  // Full refresh with loading spinner (initial load + manual Refresh button)
  const fetchOrders = useCallback(() => fetchOrdersCore(true), [fetchOrdersCore]);

  // Silent refresh — updates data without showing loading spinner
  const silentRefresh = useCallback(() => fetchOrdersCore(false), [fetchOrdersCore]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, filters]);

  // === Auto-poll FUT Transfer statuses for active orders ===
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if any orders have active FT items
  const hasActiveFTItems =
    role !== "supplier" &&
    orders.some((order) =>
      order.order_items?.some(
        (item) => item.ft_order_id && !TERMINAL_STATUSES.includes(item.status)
      )
    );

  const syncAll = useCallback(async () => {
    try {
      setSyncing(true);
      console.log("[FT Sync All] Polling all active FT items...");
      const res = await fetch("/api/sync-ft-all");

      if (!res.ok) {
        console.warn(`[FT Sync All] API returned ${res.status}`);
        return;
      }

      const data = await res.json();
      console.log("[FT Sync All] Response:", data);

      setLastSync(new Date().toLocaleTimeString());

      if (data.synced > 0) {
        // Silent refresh — always uses latest filters via ref
        silentRefresh();
      }
    } catch (err) {
      console.error("[FT Sync All] Error:", err);
    } finally {
      setSyncing(false);
    }
  }, [silentRefresh]); // silentRefresh is now stable

  useEffect(() => {
    if (!hasActiveFTItems) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    console.log(`[FT Sync All] Starting poll every ${POLL_INTERVAL_MS / 1000}s`);
    // Don't run immediately on mount — fetchOrders already ran
    pollRef.current = setInterval(syncAll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasActiveFTItems, syncAll]);

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const allowSelection = role !== "supplier";

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Orders</h1>
          {/* Live polling indicator */}
          {hasActiveFTItems && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Radio className={`h-3 w-3 ${syncing ? "animate-pulse" : "animate-pulse"}`} />
              <span>Live</span>
              {lastSync && (
                <span className="text-muted-foreground">({lastSync})</span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <OrderFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
          />
        </CardContent>
      </Card>

      {/* Results count + bulk actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm text-muted-foreground tabular-nums">
          {loading
            ? "Loading orders…"
            : totalOrders === 0
              ? "No orders match your filters"
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, totalOrders)} of ${totalOrders}`}
        </span>
        {allowSelection && selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedOrderIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionOpen(true)}
            >
              Bulk Status Update
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrderIds(new Set())}
            >
              Deselect
            </Button>
          </div>
        )}
      </div>

      {/* Role error diagnostic */}
      {roleError && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="space-y-2">
              <p className="font-semibold text-destructive">Access Issue:</p>
              <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg text-muted-foreground font-mono">
                {roleError}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <OrdersTableSkeleton />
      ) : totalOrders === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No orders found</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Try adjusting your filters or date range, or refresh to load the latest data.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <OrdersTable
            orders={paginatedOrders}
            selectedOrderIds={selectedOrderIds}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            allowSelection={allowSelection}
          />

          {/* Pagination */}
          {totalOrders > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSizeAndStore(Number(v))}
                >
                  <SelectTrigger className="w-[72px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 order-1 sm:order-2">
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {safePage} of {totalPages}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={safePage <= 1}
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={safePage >= totalPages}
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {allowSelection && bulkActionOpen && selectedOrderIds.size > 0 && (
        <BulkStatusAction
          orderIds={[...selectedOrderIds]}
          onClose={() => {
            setBulkActionOpen(false);
            setSelectedOrderIds(new Set());
          }}
        />
      )}
    </div>
  );
}
