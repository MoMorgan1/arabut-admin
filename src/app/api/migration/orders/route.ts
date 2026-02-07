import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * One-time migration: insert orders + order_items from JSON (admin only).
 * Expects body: { orders: Array<{ salla_order_id, customer_name, ... order fields, items: Array<{ item_type, product_name, status, ... }> }> }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "المسؤول فقط" }, { status: 403 });
    }

    const body = await request.json();
    const orders = body?.orders as Array<{
      salla_order_id: string;
      salla_reference_id?: string;
      customer_name: string;
      customer_phone?: string;
      customer_phone_code?: string;
      payment_method?: string;
      salla_total_sar?: number;
      exchange_rate?: number;
      status?: string;
      order_date?: string;
      notes?: string;
      settled_amount?: number;
      items: Array<{
        item_type: string;
        product_name: string;
        sku?: string;
        status?: string;
        platform?: string;
        coins_amount_k?: number;
        expected_cost?: number;
        actual_cost?: number;
      }>;
    }>;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: "المطلوب: orders مصفوفة غير فارغة" },
        { status: 400 }
      );
    }

    let insertedOrders = 0;
    let insertedItems = 0;
    const errors: string[] = [];

    for (const o of orders) {
      if (!o.salla_order_id || !o.customer_name) {
        errors.push(`طلب ناقص: salla_order_id و customer_name مطلوبان`);
        continue;
      }

      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .insert({
          salla_order_id: String(o.salla_order_id),
          salla_reference_id: o.salla_reference_id ?? null,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone ?? null,
          customer_phone_code: o.customer_phone_code ?? "+966",
          payment_method: o.payment_method ?? null,
          salla_total_sar: o.salla_total_sar ?? null,
          exchange_rate: o.exchange_rate ?? null,
          status: o.status ?? "new",
          order_date: o.order_date ?? new Date().toISOString(),
          notes: o.notes ?? null,
          settled_amount: o.settled_amount ?? null,
        })
        .select("id")
        .single();

      if (orderErr) {
        if (orderErr.code === "23505") {
          errors.push(`طلب مكرر: ${o.salla_order_id}`);
        } else {
          errors.push(`طلب ${o.salla_order_id}: ${orderErr.message}`);
        }
        continue;
      }

      if (!orderRow) continue;
      insertedOrders++;

      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        if (!it.product_name) continue;
        const { error: itemErr } = await supabase.from("order_items").insert({
          order_id: orderRow.id,
          item_type: it.item_type ?? "other",
          product_name: it.product_name,
          sku: it.sku ?? null,
          status: it.status ?? "new",
          platform: it.platform ?? null,
          coins_amount_k: it.coins_amount_k ?? null,
          expected_cost: it.expected_cost ?? null,
          actual_cost: it.actual_cost ?? null,
        });
        if (!itemErr) insertedItems++;
      }
    }

    return NextResponse.json({
      success: true,
      insertedOrders,
      insertedItems,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    console.error("Migration error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
