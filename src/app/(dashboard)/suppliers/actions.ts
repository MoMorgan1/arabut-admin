"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSupplierAction(params: {
  name: string;
  contact_info?: string;
}) {
  const supabase = await createClient();

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  // Validate inputs
  if (!params.name?.trim()) return { error: "اسم المورد مطلوب" };

  const { error } = await supabase.from("suppliers").insert({
    name: params.name.trim(),
    contact_info: params.contact_info?.trim() || null,
    balance: 0,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return { success: true };
}

export async function updateSupplierAction(
  id: string,
  params: { name?: string; contact_info?: string; is_active?: boolean }
) {
  const supabase = await createClient();

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const { error } = await supabase
    .from("suppliers")
    .update({
      ...(params.name !== undefined && { name: params.name.trim() }),
      ...(params.contact_info !== undefined && {
        contact_info: params.contact_info?.trim() || null,
      }),
      ...(params.is_active !== undefined && { is_active: params.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return { success: true };
}

export async function addSupplierTransactionAction(
  supplierId: string,
  params: {
    type: "deposit" | "deduction" | "refund" | "adjustment";
    amount: number;
    note?: string;
  }
) {
  const supabase = await createClient();

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  // Validate inputs
  if (!supplierId?.trim()) return { error: "معرّف المورد مطلوب" };
  if (!params.amount || params.amount <= 0) return { error: "المبلغ يجب أن يكون أكبر من صفر" };
  const validTypes = ["deposit", "deduction", "refund", "adjustment"];
  if (!validTypes.includes(params.type)) return { error: "نوع معاملة غير صالح" };

  const { data: supplier, error: fetchErr } = await supabase
    .from("suppliers")
    .select("balance")
    .eq("id", supplierId)
    .single();

  if (fetchErr || !supplier) return { error: "المورد غير موجود" };

  const currentBalance = supplier.balance;
  const amount = Math.abs(params.amount);
  let newBalance: number;

  switch (params.type) {
    case "deposit":
    case "refund":
      newBalance = currentBalance + amount;
      break;
    case "deduction":
    case "adjustment":
      newBalance = currentBalance - amount;
      break;
    default:
      return { error: "نوع معاملة غير صالح" };
  }

  if (newBalance < 0) {
    return { error: "الرصيد لا يكفي لهذه العملية" };
  }

  const { error: updateErr } = await supabase
    .from("suppliers")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierId);

  if (updateErr) return { error: updateErr.message };

  const { error: txErr } = await supabase.from("supplier_transactions").insert({
    supplier_id: supplierId,
    type: params.type,
    amount,
    balance_after: newBalance,
    note: params.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (txErr) return { error: txErr.message };

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  return { success: true };
}
