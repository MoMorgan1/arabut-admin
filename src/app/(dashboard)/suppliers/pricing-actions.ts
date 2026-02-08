"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addSupplierPriceAction(params: {
  supplier_id: string;
  service_type: "coins" | "fut_rank" | "rivals" | "sbc_challenge";
  platform: "PS" | "PC";
  price_usd: number;
  rank_level?: number;
  division_level?: number;
  is_fast_service?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Admin only" };

  if (!params.supplier_id) return { error: "Supplier ID is required" };
  if (params.price_usd <= 0) return { error: "Price must be greater than 0" };

  const { error } = await supabase.from("supplier_prices").insert({
    supplier_id: params.supplier_id,
    service_type: params.service_type,
    platform: params.platform,
    price_usd: params.price_usd,
    rank_level: params.rank_level ?? null,
    division_level: params.division_level ?? null,
    is_fast_service: params.is_fast_service ?? false,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath(`/suppliers/${params.supplier_id}`);
  return { success: true };
}

export async function updateSupplierPriceAction(
  priceId: string,
  params: {
    price_usd?: number;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Admin only" };

  if (params.price_usd !== undefined && params.price_usd <= 0) {
    return { error: "Price must be greater than 0" };
  }

  const { error } = await supabase
    .from("supplier_prices")
    .update({
      ...(params.price_usd !== undefined && { price_usd: params.price_usd }),
      ...(params.is_active !== undefined && { is_active: params.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", priceId);

  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { success: true };
}

export async function deleteSupplierPriceAction(priceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Admin only" };

  const { error } = await supabase
    .from("supplier_prices")
    .delete()
    .eq("id", priceId);

  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { success: true };
}

// Calculate cost for an order item based on supplier pricing
export async function calculateSupplierCost(params: {
  supplier_id: string;
  item_type: "coins" | "fut_rank" | "rivals" | "sbc" | "other";
  platform: "PS" | "PC";
  coins_amount_k?: number;
  rank_level?: number;
  division_level?: number;
  is_fast_service?: boolean;
}): Promise<number | null> {
  const supabase = await createClient();

  // Map item_type to service_type
  let serviceType: "coins" | "fut_rank" | "rivals" | "sbc";
  if (params.item_type === "fut_rank") serviceType = "fut_rank";
  else if (params.item_type === "rivals") serviceType = "rivals";
  else if (params.item_type === "coins") serviceType = "coins";
  else if (params.item_type === "sbc") serviceType = "sbc";
  else return null;

  let query = supabase
    .from("supplier_prices")
    .select("price_usd")
    .eq("supplier_id", params.supplier_id)
    .eq("service_type", serviceType)
    .eq("platform", params.platform)
    .eq("is_active", true);

  if (serviceType === "fut_rank" && params.rank_level) {
    // Get base rank price
    const { data: basePrice } = await supabase
      .from("supplier_prices")
      .select("price_usd")
      .eq("supplier_id", params.supplier_id)
      .eq("service_type", "fut_rank")
      .eq("platform", params.platform)
      .eq("rank_level", params.rank_level)
      .eq("is_fast_service", false)
      .eq("is_active", true)
      .single();
    
    if (!basePrice) return null;
    
    let totalCost = basePrice.price_usd;
    
    // If fast service requested, add the fast service fee
    if (params.is_fast_service) {
      const { data: fastFee } = await supabase
        .from("supplier_prices")
        .select("price_usd")
        .eq("supplier_id", params.supplier_id)
        .eq("service_type", "fut_rank")
        .eq("platform", params.platform)
        .eq("rank_level", 0) // 0 = fast service fee
        .eq("is_fast_service", true)
        .eq("is_active", true)
        .single();
      
      if (fastFee) {
        totalCost += fastFee.price_usd;
      }
    }
    
    return totalCost;
  } else if (serviceType === "rivals" && params.division_level) {
    query = query.eq("division_level", params.division_level);
  } else if (serviceType === "coins") {
    // For coins, price is per million
    query = query.is("rank_level", null).is("division_level", null);
  } else if (serviceType === "sbc") {
    query = query.is("rank_level", null).is("division_level", null);
  } else {
    return null;
  }

  const { data } = await query.single();
  
  if (!data) return null;

  // For coins, multiply by amount (price is per million)
  if (serviceType === "coins" && params.coins_amount_k) {
    return (data.price_usd / 1000) * params.coins_amount_k;
  }

  return data.price_usd;
}

// Calculate BOTH costs for SBC orders (coins + service)
export async function calculateSBCCosts(params: {
  supplier_id: string;
  platform: "PS" | "PC";
  coins_amount_k?: number;
  challenges_count?: number;
}): Promise<{ coins_cost: number | null; service_cost: number | null }> {
  const supabase = await createClient();

  // Get both pricing rules in parallel
  // Note: SBC uses regular 'coins' pricing for coins cost
  const [coinsQuery, serviceQuery] = await Promise.all([
    supabase
      .from("supplier_prices")
      .select("price_usd")
      .eq("supplier_id", params.supplier_id)
      .eq("service_type", "coins")
      .eq("platform", params.platform)
      .eq("is_active", true)
      .is("rank_level", null)
      .is("division_level", null)
      .single(),
    supabase
      .from("supplier_prices")
      .select("price_usd")
      .eq("supplier_id", params.supplier_id)
      .eq("service_type", "sbc_challenge")
      .eq("platform", params.platform)
      .eq("is_active", true)
      .is("rank_level", null)
      .is("division_level", null)
      .single(),
  ]);

  let coinsCost: number | null = null;
  let serviceCost: number | null = null;

  // Calculate coins cost (per million) - same as regular coins
  if (coinsQuery.data && params.coins_amount_k) {
    coinsCost = (coinsQuery.data.price_usd / 1000) * params.coins_amount_k;
  }

  // Calculate service cost (per challenge)
  if (serviceQuery.data && params.challenges_count) {
    serviceCost = serviceQuery.data.price_usd * params.challenges_count;
  }

  return { coins_cost: coinsCost, service_cost: serviceCost };
}
