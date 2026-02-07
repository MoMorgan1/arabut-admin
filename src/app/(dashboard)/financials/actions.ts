"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addExpenseAction(params: {
  description: string;
  amount: number;
  category: string;
  is_recurring: boolean;
  recurring_months: number;
  monthly_share: number | null;
  expense_date: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!params.description?.trim()) return { error: "Description is required" };
  if (!params.amount || params.amount <= 0) return { error: "Amount must be greater than zero" };
  if (!params.category?.trim()) return { error: "Category is required" };
  if (!params.expense_date || !/^\d{4}-\d{2}-\d{2}/.test(params.expense_date)) {
    return { error: "Invalid expense date" };
  }

  const { error } = await supabase.from("expenses").insert({
    description: params.description,
    amount: params.amount,
    category: params.category,
    is_recurring: params.is_recurring,
    recurring_months: params.recurring_months,
    monthly_share: params.monthly_share,
    expense_date: params.expense_date,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/financials");
  return { success: true };
}
