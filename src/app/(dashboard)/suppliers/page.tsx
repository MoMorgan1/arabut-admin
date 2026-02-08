import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import SupplierCard from "@/components/suppliers/SupplierCard";
import AddSupplierForm from "@/components/suppliers/AddSupplierForm";
import { Users } from "lucide-react";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: "admin" | "employee" | "supplier" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("display_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Suppliers</h1>
        </div>
        {role === "admin" && <AddSupplierForm />}
      </div>

      {!suppliers?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No suppliers registered. You can add them from settings or via the database.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}
