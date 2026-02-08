"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRole = "admin" | "employee" | "supplier" | null;

interface UserRoleState {
  role: UserRole;
  userId: string | null;
  supplierId: string | null;
  loading: boolean;
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    userId: null,
    supplierId: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (active) {
          setState({ role: null, userId: null, supplierId: null, loading: false });
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      let supplierId: string | null = null;
      if (profile?.role === "supplier") {
        const { data: supplier } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        supplierId = supplier?.id ?? null;
      }

      if (active) {
        setState({
          role: (profile?.role as UserRole) ?? null,
          userId: user.id,
          supplierId,
          loading: false,
        });
      }
    }

    loadRole();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
