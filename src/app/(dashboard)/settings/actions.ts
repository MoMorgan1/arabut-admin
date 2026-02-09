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

  // Use admin client to bypass RLS for system_settings
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const trimmedValue = value.trim();
  const now = new Date().toISOString();

  // Try update first
  const { data: updated, error: updateErr } = await adminSupabase
    .from("system_settings")
    .update({ value: trimmedValue, updated_at: now })
    .eq("key", key)
    .select("key")
    .single();

  if (updateErr && updateErr.code === "PGRST116") {
    // Row doesn't exist — insert it
    const { error: insertErr } = await adminSupabase
      .from("system_settings")
      .insert({ key, value: trimmedValue, updated_at: now });

    if (insertErr) return { error: "Insert failed: " + insertErr.message };
  } else if (updateErr) {
    return { error: "Update failed: " + updateErr.message };
  }

  // Verify the save actually worked
  const { data: verify } = await adminSupabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (verify?.value !== trimmedValue) {
    return { error: `Save verification failed. Expected "${trimmedValue}" but got "${verify?.value}"` };
  }

  revalidatePath("/settings");
  revalidatePath("/orders");
  return { success: true, savedValue: verify.value };
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

  // Check if user already exists with this email
  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === params.email.trim().toLowerCase()
  );
  if (existingUser) {
    return { error: `A user with email "${params.email}" already exists` };
  }

  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: params.email.trim(),
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name.trim(),
      role: params.role,
    },
  });

  if (authError) {
    console.error("Auth createUser error:", authError);
    return { error: `Failed to create user: ${authError.message}` };
  }
  if (!newUser?.user) return { error: "Failed to create user — no user returned" };

  // Ensure profile exists with correct role (trigger may or may not have created it)
  const { error: profileErr } = await adminSupabase
    .from("profiles")
    .upsert(
      {
        id: newUser.user.id,
        full_name: params.full_name.trim(),
        role: params.role,
        is_active: true,
      },
      { onConflict: "id" }
    );

  if (profileErr) {
    console.error("Profile upsert error:", profileErr);
    // User was created in auth but profile failed — still report success with warning
    revalidatePath("/settings");
    return {
      success: true,
      userId: newUser.user.id,
      warning: `User created but profile setup had an issue: ${profileErr.message}. The profile may need manual correction.`,
    };
  }

  if (params.role === "supplier") {
    const { error: supplierErr } = await adminSupabase.from("suppliers").insert({
      display_name: params.full_name.trim(),
      user_id: newUser.user.id,
      balance: 0,
      is_active: true,
    });
    if (supplierErr) {
      console.error("Supplier create error:", supplierErr);
      revalidatePath("/settings");
      return {
        success: true,
        userId: newUser.user.id,
        warning: `User created but supplier setup had an issue: ${supplierErr.message}. The supplier may need manual correction.`,
      };
    }
    revalidatePath("/suppliers");
  }

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

// =================== Delete User (Hard Delete) ===================

export async function deleteUserAction(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can delete users" };

  // Prevent self-deletion
  if (userId === user.id) {
    return { error: "You cannot delete your own account" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  // Delete from auth.users — this cascades to profiles automatically
  const { error } = await adminSupabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Delete user error:", error);
    return { error: `Failed to delete user: ${error.message}` };
  }

  revalidatePath("/settings");
  return { success: true };
}

// =================== Reset User Password (Admin) ===================

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Only admins can reset passwords" };

  if (newPassword.length < 6) return { error: "Password must be at least 6 characters" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    console.error("Reset password error:", error);
    return { error: `Failed to reset password: ${error.message}` };
  }

  return { success: true };
}

// =================== Change Own Password ===================

export async function changeOwnPasswordAction(newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (newPassword.length < 6) return { error: "Password must be at least 6 characters" };

  // Use admin client to update the user's password
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    console.error("Change password error:", error);
    return { error: `Failed to change password: ${error.message}` };
  }

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
    email: params.email.trim(),
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name.trim(),
      role: "supplier",
    },
  });

  if (authError) {
    console.error("Supplier createUser error:", authError);
    return { error: `Failed to create account: ${authError.message}` };
  }
  if (!newUser?.user) return { error: "Failed to create account — no user returned" };

  // Ensure profile
  await adminSupabase
    .from("profiles")
    .upsert(
      {
        id: newUser.user.id,
        full_name: params.full_name.trim(),
        role: "supplier",
        is_active: true,
      },
      { onConflict: "id" }
    );

  // Link supplier record to user
  await adminSupabase
    .from("suppliers")
    .update({ user_id: newUser.user.id })
    .eq("id", params.supplier_id);

  revalidatePath("/settings");
  revalidatePath("/suppliers");
  return { success: true };
}
