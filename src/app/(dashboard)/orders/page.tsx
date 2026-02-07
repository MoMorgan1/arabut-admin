"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrdersTable, { type OrderRowData } from "@/components/orders/OrdersTable";
import OrderFilters from "@/components/orders/OrderFilters";
import BulkStatusAction from "@/components/orders/BulkStatusAction";
import { DEFAULT_FILTERS, type OrderFilters as OrderFiltersType } from "@/types/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrderFiltersType>(DEFAULT_FILTERS);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const supabase = createClient();

  function handleSelectionChange(id: string, checked: boolean) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    else setSelectedOrderIds(new Set());
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      // Build query
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("order_date", { ascending: false })
        .limit(100);

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `customer_name.ilike.%${filters.search}%,salla_order_id.ilike.%${filters.search}%`
        );
      }

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte("order_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("order_date", `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("خطأ في جلب الطلبات");
        setOrders([]);
        return;
      }

      let filteredOrders = (data as OrderRowData[]) ?? [];

      // Client-side filtering for status and item type (since they're on order_items)
      if (filters.status !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items.some((item) => item.status === filters.status)
        );
      }

      if (filters.itemType !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items.some((item) => item.item_type === filters.itemType)
        );
      }

      setOrders(filteredOrders);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("حدث خطأ غير متوقع");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">إدارة الطلبات</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
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
        <span className="text-sm text-muted-foreground">
          {loading ? "جاري التحميل..." : `${orders.length} طلب`}
        </span>
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedOrderIds.size} محدّد
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionOpen(true)}
            >
              تغيير الحالة جماعياً
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrderIds(new Set())}
            >
              إلغاء التحديد
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="mr-2 text-muted-foreground">جاري تحميل الطلبات...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <OrdersTable
          orders={orders}
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
        />
      )}

      {bulkActionOpen && selectedOrderIds.size > 0 && (
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
