"use client";

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import OrdersTable, { type OrderRowData } from "@/components/orders/OrdersTable";
import OrdersTableSkeleton from "@/components/orders/OrdersTableSkeleton";
import OrderFilters from "@/components/orders/OrderFilters";
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

// Dynamic imports for better code splitting
const BulkStatusAction = lazy(() => import("@/components/orders/BulkStatusAction"));

const POLL_INTERVAL_MS = 5000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const STORAGE_KEY_PAGE_SIZE = "arabut-orders-page-size";

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
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  // Server-side pagination - no client-side slicing needed
  const safePage = Math.min(page, totalPages) || 1;

  // Keep page in bounds when totalPages changes
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
    const pageOrderIds = orders.map((o) => o.id);
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

  // Core fetch logic — reads filters from ref (never stale) and uses server-side API
  const fetchOrdersCore = useCallback(async (showLoading: boolean) => {
    const currentFilters = filtersRef.current;

    if (showLoading) {
      setLoading(true);
      setRoleError(null);
    }

    try {
      // Build query params for API
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: currentFilters.status,
        itemType: currentFilters.itemType,
      });

      if (currentFilters.search) params.set("search", currentFilters.search);
      if (currentFilters.dateFrom) params.set("dateFrom", currentFilters.dateFrom);
      if (currentFilters.dateTo) params.set("dateTo", currentFilters.dateTo);

      const response = await fetch(`/api/orders?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          setRoleError("Not signed in. Please log in first.");
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
          if (showLoading) setLoading(false);
          return;
        }

        if (response.status === 403) {
          setRoleError(
            errorData.error || "Your account doesn't have permission to view orders."
          );
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
          if (showLoading) setLoading(false);
          return;
        }

        throw new Error(errorData.error || "Failed to fetch orders");
      }

      const data = await response.json();

      setOrders(data.orders || []);
      setTotalOrders(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setRole(data.role);
      setRoleError(null);
    } catch (err) {
      console.error("Unexpected error:", err);
      if (showLoading) toast.error("An unexpected error occurred");
      setOrders([]);
      setTotalOrders(0);
      setTotalPages(1);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [page, pageSize]); // Depends on page and pageSize for API call

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
            orders={orders}
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
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <BulkStatusAction
            orderIds={[...selectedOrderIds]}
            onClose={() => {
              setBulkActionOpen(false);
              setSelectedOrderIds(new Set());
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
