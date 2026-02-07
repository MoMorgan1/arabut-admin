"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// =================== System Settings ===================

export async function updateSystemSettingAction(key: string, value: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can modify settings" };

  if (!key?.trim()) return { error: "Key is required" };
  if (!value?.trim()) return { error: "Value is required" };

  // Use admin client to bypass RLS for system_settings upsert
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("system_settings")
    .upsert(
      {
        key,
        value: value.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/orders");
  return { success: true };
}

// =================== Pricing Rules ===================

export async function addPricingRuleAction(params: {
  platform: string;
  shipping_type: string;
  min_amount_k: number;
  max_amount_k: number | null;
  price_per_million_usd: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validate
  if (!["PS", "PC"].includes(params.platform)) return { error: "Invalid platform" };
  if (!["fast", "slow"].includes(params.shipping_type)) return { error: "Invalid shipping type" };
  if (params.min_amount_k < 0) return { error: "Minimum must be 0 or more" };
  if (params.price_per_million_usd <= 0) return { error: "Price must be greater than zero" };

  const { error } = await supabase.from("pricing_rules").insert({
    platform: params.platform,
    shipping_type: params.shipping_type,
    min_amount_k: params.min_amount_k,
    max_amount_k: params.max_amount_k,
    price_per_million_usd: params.price_per_million_usd,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function updatePricingRuleAction(
  id: string,
  params: {
    min_amount_k?: number;
    max_amount_k?: number | null;
    price_per_million_usd?: number;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("pricing_rules")
    .update({
      ...params,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function deletePricingRuleAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("pricing_rules")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

// =================== User Management ===================

export async function inviteUserAction(params: {
  email: string;
  full_name: string;
  role: "admin" | "employee" | "supplier";
  password: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can add users" };

  // Validate
  if (!params.email?.includes("@")) return { error: "Invalid email" };
  if (!params.full_name?.trim()) return { error: "Name is required" };
  if (params.password.length < 6) return { error: "Password must be at least 6 characters" };

  // Use admin client to create user
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name,
      role: params.role,
    },
  });

  if (authError) return { error: authError.message };
  if (!newUser?.user) return { error: "Failed to create user" };

  // The trigger should auto-create profile, but let's ensure the role is correct
  await adminSupabase
    .from("profiles")
    .upsert({
      id: newUser.user.id,
      full_name: params.full_name,
      role: params.role,
      is_active: true,
    });

  revalidatePath("/settings");
  return { success: true, userId: newUser.user.id };
}

export async function updateUserRoleAction(
  userId: string,
  params: { role?: "admin" | "employee" | "supplier"; is_active?: boolean }
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

  // Prevent self-demotion
  if (userId === user.id && params.role && params.role !== "admin") {
    return { error: "You cannot change your own role" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.role) updateData.role = params.role;
  if (params.is_active !== undefined) updateData.is_active = params.is_active;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

// =================== Supplier Account ===================

export async function createSupplierAccountAction(params: {
  email: string;
  password: string;
  full_name: string;
  supplier_id: string;
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

  if (!params.email?.includes("@")) return { error: "Invalid email" };
  if (params.password.length < 6) return { error: "Password must be at least 6 characters" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  // Create auth user
  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name,
      role: "supplier",
    },
  });

  if (authError) return { error: authError.message };
  if (!newUser?.user) return { error: "Failed to create account" };

  // Ensure profile
  await adminSupabase
    .from("profiles")
    .upsert({
      id: newUser.user.id,
      full_name: params.full_name,
      role: "supplier",
      is_active: true,
    });

  // Link supplier record to user
  await adminSupabase
    .from("suppliers")
    .update({ user_id: newUser.user.id })
    .eq("id", params.supplier_id);

  revalidatePath("/settings");
  revalidatePath("/suppliers");
  return { success: true };
}
