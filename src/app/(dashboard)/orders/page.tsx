"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrdersTable, { type OrderRowData } from "@/components/orders/OrdersTable";
import OrderFilters from "@/components/orders/OrderFilters";
import BulkStatusAction from "@/components/orders/BulkStatusAction";
import { DEFAULT_FILTERS, TERMINAL_STATUSES, type OrderFilters as OrderFiltersType } from "@/types/orders";
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
  const [roleError, setRoleError] = useState<string | null>(null);
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
    setRoleError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRoleError("Not signed in. Please log in first.");
        setOrders([]);
        setLoading(false);
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
        setLoading(false);
        return;
      }

      if (!["admin", "employee"].includes(profile.role)) {
        setRoleError(
          `Your account role is "${profile.role}" — needs to be admin or employee to view orders. ` +
          `Run in SQL Editor:\nUPDATE profiles SET role = 'admin' WHERE id = '${user.id}';`
        );
        setOrders([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("order_date", { ascending: false })
        .limit(100);

      if (filters.search) {
        query = query.or(
          `customer_name.ilike.%${filters.search}%,salla_order_id.ilike.%${filters.search}%`
        );
      }

      if (filters.dateFrom) {
        query = query.gte("order_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("order_date", `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("Error fetching orders: " + error.message);
        setOrders([]);
        return;
      }

      let filteredOrders = (data as OrderRowData[]) ?? [];

      if (filters.status === "active") {
        // Show orders where NOT all items are in a terminal status
        filteredOrders = filteredOrders.filter((order) => {
          const items = order.order_items ?? [];
          if (items.length === 0) return true; // no items = still active
          return !items.every((item) => TERMINAL_STATUSES.includes(item.status));
        });
      } else if (filters.status !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items?.some((item) => item.status === filters.status)
        );
      }

      if (filters.itemType !== "all") {
        filteredOrders = filteredOrders.filter((order) =>
          order.order_items?.some((item) => item.item_type === filters.itemType)
        );
      }

      setOrders(filteredOrders);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
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
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Orders</h1>
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
        <span className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${orders.length} orders`}
        </span>
        {selectedOrderIds.size > 0 && (
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
        <Card>
          <CardContent className="py-16">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading orders...</span>
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
