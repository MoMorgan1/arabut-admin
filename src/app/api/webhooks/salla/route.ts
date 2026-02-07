import { NextRequest, NextResponse } from "next/server";
import type { SallaWebhookPayload } from "@/types/api";
import { processSallaWebhook } from "@/lib/salla/webhook-handler";

export async function POST(request: NextRequest) {
  try {
    // TODO: Validate webhook signature with SALLA_WEBHOOK_SECRET
    // const signature = request.headers.get("x-salla-signature");

    const payload = (await request.json()) as SallaWebhookPayload;

    if (!payload?.body?.id) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const result = await processSallaWebhook(payload);

    if (!result.success) {
      console.warn("Webhook processed with warning:", result.error);
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 200 } // Still 200 — Salla expects acknowledgment
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
