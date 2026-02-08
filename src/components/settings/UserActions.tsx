"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserRoleAction } from "@/app/(dashboard)/settings/actions";

interface Props {
  userId: string;
  currentRole: string;
  isActive: boolean;
}

export default function UserActions({ userId, currentRole, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: string) {
    setLoading(true);
    const result = await updateUserRoleAction(userId, {
      role: newRole as "admin" | "employee" | "supplier",
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Role updated");
    router.refresh();
  }

  async function handleToggleActive() {
    setLoading(true);
    const result = await updateUserRoleAction(userId, {
      is_active: !isActive,
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success(isActive ? "Account disabled" : "Account enabled");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select value={currentRole} onValueChange={handleRoleChange} disabled={loading}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="supplier">Supplier</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className={`text-xs h-8 ${isActive ? "text-destructive" : "text-green-500"}`}
        onClick={handleToggleActive}
        disabled={loading}
      >
        {isActive ? "Disable" : "Enable"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-8 text-destructive hover:text-destructive"
        onClick={async () => {
          if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
          setLoading(true);
          const result = await updateUserRoleAction(userId, { is_active: false });
          setLoading(false);
          if (result?.error) { toast.error(result.error); return; }
          toast.success("User disabled (soft delete)");
          router.refresh();
        }}
        disabled={loading}
      >
        Delete
      </Button>
    </div>
  );
}
