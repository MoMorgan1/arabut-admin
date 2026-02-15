import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TERMINAL_STATUSES } from "@/types/orders";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)))
    );

    // Filter params
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const itemType = searchParams.get("itemType") || "all";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "employee", "supplier"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .order("order_date", { ascending: false });

    // Date filters
    if (dateFrom) {
      query = query.gte("order_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("order_date", `${dateTo}T23:59:59`);
    }

    // Get total count for pagination (before applying limit/offset)
    const { count } = await query;

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    let filteredOrders = data || [];

    // Client-side filters (for complex filtering)
    if (search) {
      const q = search.toLowerCase();
      filteredOrders = filteredOrders.filter((order: any) => {
        const nameMatch = order.customer_name?.toLowerCase().includes(q);
        const orderIdMatch = order.salla_order_id?.toString().includes(q);
        const emailMatch = order.order_items?.some(
          (item: any) => item.ea_email?.toLowerCase().includes(q)
        );
        return nameMatch || orderIdMatch || emailMatch;
      });
    }

    if (status === "active") {
      filteredOrders = filteredOrders.filter((order: any) => {
        const items = order.order_items ?? [];
        if (items.length === 0) return true;
        return !items.every((item: any) => TERMINAL_STATUSES.includes(item.status));
      });
    } else if (status !== "all") {
      filteredOrders = filteredOrders.filter((order: any) =>
        order.order_items?.some((item: any) => item.status === status)
      );
    }

    if (itemType !== "all") {
      filteredOrders = filteredOrders.filter((order: any) =>
        order.order_items?.some((item: any) => item.item_type === itemType)
      );
    }

    return NextResponse.json({
      orders: filteredOrders,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      role: profile.role,
    });
  } catch (err) {
    console.error("Unexpected error in orders API:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
