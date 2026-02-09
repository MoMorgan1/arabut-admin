"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateUserRoleAction,
  deleteUserAction,
  resetUserPasswordAction,
} from "@/app/(dashboard)/settings/actions";

interface Props {
  userId: string;
  currentRole: string;
  isActive: boolean;
}

export default function UserActions({ userId, currentRole, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    setLoading(true);
    const result = await deleteUserAction(userId);
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("User deleted permanently");
    router.refresh();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    const result = await resetUserPasswordAction(userId, newPassword);
    setResetLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Password reset successfully");
    setNewPassword("");
    setResetOpen(false);
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

      {/* Reset Password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1" disabled={loading}>
            <KeyRound className="h-3.5 w-3.5" />
            Reset PW
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetLoading} className="gap-2">
                {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-8 text-destructive hover:text-destructive gap-1"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}
