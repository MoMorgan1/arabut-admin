import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  // Use regular client to verify the user is authenticated + admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Use admin client (service role) for bulk operations — bypasses RLS
  const adminSupabase = createAdminClient();

  try {
    // Get all default pricing rules
    const { data: defaultPrices, error: fetchErr } = await adminSupabase
      .from("default_supplier_prices")
      .select("*")
      .eq("is_active", true);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!defaultPrices || defaultPrices.length === 0) {
      return NextResponse.json({ error: "No default pricing rules found" }, { status: 400 });
    }

    // Get all active suppliers
    const { data: suppliers, error: suppliersErr } = await adminSupabase
      .from("suppliers")
      .select("id")
      .eq("is_active", true);

    if (suppliersErr) {
      return NextResponse.json({ error: suppliersErr.message }, { status: 500 });
    }

    if (!suppliers || suppliers.length === 0) {
      return NextResponse.json({ error: "No active suppliers found" }, { status: 400 });
    }

    // Delete existing pricing for all suppliers
    const { error: deleteErr } = await adminSupabase
      .from("supplier_prices")
      .delete()
      .in("supplier_id", suppliers.map(s => s.id));

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Copy default prices to each supplier
    const newPrices = suppliers.flatMap(supplier =>
      defaultPrices.map(price => ({
        supplier_id: supplier.id,
        service_type: price.service_type,
        platform: price.platform,
        price_usd: price.price_usd,
        rank_level: price.rank_level,
        division_level: price.division_level,
        is_fast_service: price.is_fast_service,
        is_active: true,
      }))
    );

    const { error: insertErr } = await adminSupabase
      .from("supplier_prices")
      .insert(newPrices);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: suppliers.length,
      rulesPerSupplier: defaultPrices.length,
    });
  } catch (error) {
    console.error("Copy pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
