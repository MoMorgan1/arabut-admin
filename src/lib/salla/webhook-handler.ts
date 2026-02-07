import type { SallaWebhookPayload } from "@/types/api";
import type { OrderType } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectProductType, parseItemOptions } from "./sku-parser";
import {
  checkAvailableStock,
  createInternalOrder,
  buyCoins,
} from "@/lib/fut-transfer/api";
import {
  calculateMaxPricePer100K,
  calculateExpectedCostUSD,
  getTopUpEnabled,
  shouldUseInternalStock,
} from "@/lib/fut-transfer/pricing";

interface ProcessResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

/**
 * Main webhook handler — processes a Salla order
 */
export async function processSallaWebhook(
  payload: SallaWebhookPayload
): Promise<ProcessResult> {
  const supabase = createAdminClient();
  const body = payload.body;

  // Reject free / unpaid orders
  if (
    body.payment_method === "free" ||
    body.status.slug === "waiting" ||
    body.status.slug === "awaiting_payment"
  ) {
    return { success: false, error: "Order is not paid or is free" };
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("salla_order_id", String(body.id))
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Order ${body.id} already exists` };
  }

  // Create parent order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      salla_order_id: String(body.id),
      salla_reference_id: body.reference_id,
      customer_name: body.customer.full_name,
      customer_phone: body.customer.mobile,
      customer_phone_code: body.customer.mobile_code,
      payment_method: body.payment_method,
      salla_total_sar: body.amounts.total.amount,
      exchange_rate: body.exchange_rate?.rate,
      status: "new",
      order_date: body.date.date,
      raw_webhook: body as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { success: false, error: `Failed to create order: ${orderError?.message}` };
  }

  // Process each item
  for (const item of body.items) {
    const itemType: OrderType = detectProductType(item.sku, item.name);
    const options = parseItemOptions(item);

    // Build base item data
    const itemData: Record<string, unknown> = {
      order_id: order.id,
      item_type: itemType,
      product_name: item.name,
      sku: item.sku,
      ea_email: options.email,
      ea_password: options.password,
      backup_code_1: options.backupCode1,
      backup_code_2: options.backupCode2,
      backup_code_3: options.backupCode3,
      platform: options.platform,
    };

    if (itemType === "coins" && options.amountK) {
      // Calculate pricing
      const isSlow = options.shippingType === "slow";
      const maxPriceEur = calculateMaxPricePer100K(options.platform, options.amountK, isSlow);
      const expectedCost = calculateExpectedCostUSD(maxPriceEur, options.amountK);
      const topUpEnabled = getTopUpEnabled(options.amountK);

      itemData.coins_amount_k = options.amountK;
      itemData.shipping_type = options.shippingType;
      itemData.max_price_eur = maxPriceEur;
      itemData.top_up_enabled = topUpEnabled;
      itemData.expected_cost = expectedCost;
      itemData.status = "processing";

      // Insert item first
      const { data: createdItem, error: itemError } = await supabase
        .from("order_items")
        .insert(itemData)
        .select("id")
        .single();

      if (itemError || !createdItem) {
        console.error(`Failed to create order item: ${itemError?.message}`);
        continue;
      }

      // Try to fulfill via FUT Transfer
      try {
        const stock = await checkAvailableStock();
        const platformStock = options.platform === "PC" ? stock.pcTotal : stock.psTotal;
        const useInternal = shouldUseInternalStock(options.platform, options.amountK, platformStock);

        const commonParams = {
          customerName: body.customer.full_name,
          user: options.email || "",
          pass: options.password || "",
          ba: options.backupCode1 || "",
          ba2: options.backupCode2 || "",
          ba3: options.backupCode3 || "",
          platform: options.platform,
          amount: options.amountK,
          externalOrderID: String(body.id),
          topUpEnabled,
        };

        let ftResponse;
        if (useInternal) {
          ftResponse = await createInternalOrder(commonParams);
          await supabase
            .from("order_items")
            .update({
              fulfillment_method: "internal",
              ft_order_id: ftResponse.orderId,
            })
            .eq("id", createdItem.id);
        } else {
          ftResponse = await buyCoins({
            ...commonParams,
            buyNowThreshold: maxPriceEur,
          });
          await supabase
            .from("order_items")
            .update({
              fulfillment_method: "external",
              ft_order_id: ftResponse.orderId,
            })
            .eq("id", createdItem.id);
        }
      } catch (err) {
        console.error("FUT Transfer API error:", err);
        // Item stays in processing status — will be retried or handled manually
      }

      // Log status change
      await supabase.from("order_status_log").insert({
        order_item_id: createdItem.id,
        old_status: null,
        new_status: "processing",
        note: "Auto-created from Salla webhook",
      });
    } else {
      // Service items — just insert with status "new"
      itemData.status = "new";

      const { data: createdItem, error: itemError } = await supabase
        .from("order_items")
        .insert(itemData)
        .select("id")
        .single();

      if (itemError || !createdItem) {
        console.error(`Failed to create service item: ${itemError?.message}`);
        continue;
      }

      // Log status
      await supabase.from("order_status_log").insert({
        order_item_id: createdItem.id,
        old_status: null,
        new_status: "new",
        note: "Service order from Salla webhook",
      });

      // Create notification for employees
      await supabase.from("notifications").insert({
        user_id: null as unknown as string, // broadcast — will be filtered by role
        title: `طلب خدمة جديد: ${item.name}`,
        message: `طلب جديد من ${body.customer.full_name} — ${item.name}`,
        type: "info",
        link: `/orders/${order.id}`,
      });
    }
  }

  return { success: true, orderId: order.id };
}
