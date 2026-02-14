import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSettlementExcel } from "@/lib/settlements/parser";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for settlement operations to bypass RLS
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    // File extension validation
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = parseSettlementExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in the file" },
        { status: 400 }
      );
    }

    // Create settlement record using admin client
    const fileName = file.name;
    const totalAmount = rows.reduce((sum, r) => sum + r.settled_amount, 0);

    // Check if user has a profile (for uploaded_by field)
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const { data: settlement, error: settlementError } = await adminSupabase
      .from("revenue_settlements")
      .insert({
        file_name: fileName,
        settlement_date: new Date().toISOString(), // Add settlement_date
        total_amount: totalAmount,
        matched_count: 0,
        unmatched_count: rows.length,
        uploaded_by: profile?.id ?? null, // Only set if profile exists
      })
      .select("id")
      .single();

    if (settlementError || !settlement) {
      console.error("Settlement insert error:", settlementError);
      console.error("Error details:", JSON.stringify(settlementError, null, 2));
      return NextResponse.json(
        { 
          error: "Failed to create settlement record",
          details: settlementError?.message || "Unknown error",
          code: settlementError?.code || "N/A"
        },
        { status: 500 }
      );
    }

    // Get all orders by salla_order_id for matching
    const orderIds = [...new Set(rows.map((r) => r.salla_order_id))];
    const { data: orders } = await adminSupabase
      .from("orders")
      .select("id, salla_order_id")
      .in("salla_order_id", orderIds);

    const orderBySallaId = new Map(
      (orders ?? []).map((o) => [o.salla_order_id, o.id])
    );

    let matchedCount = 0;

    for (const row of rows) {
      const orderId = orderBySallaId.get(row.salla_order_id) ?? null;
      const isMatched = !!orderId;

      await adminSupabase.from("settlement_items").insert({
        settlement_id: settlement.id,
        salla_order_id: row.salla_order_id,
        settled_amount: row.settled_amount,
        is_matched: isMatched,
        order_id: orderId,
      });

      if (isMatched && orderId) {
        await adminSupabase
          .from("orders")
          .update({
            settled_amount: row.settled_amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        matchedCount++;
      }
    }

    await adminSupabase
      .from("revenue_settlements")
      .update({
        matched_count: matchedCount,
        unmatched_count: rows.length - matchedCount,
      })
      .eq("id", settlement.id);

    return NextResponse.json({
      success: true,
      settlementId: settlement.id,
      totalRows: rows.length,
      matchedCount,
      unmatchedCount: rows.length - matchedCount,
      totalAmount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("Settlement upload error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
