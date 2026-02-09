"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inviteUserAction } from "@/app/(dashboard)/settings/actions";

export default function InviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "employee" | "supplier">("employee");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
    setLoading(true);
    const result = await inviteUserAction({
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      password,
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    if (result?.warning) {
      toast.warning(result.warning);
    }
    toast.success(`Account created for ${fullName}`);
    setOpen(false);
    setEmail(""); setFullName(""); setRole("employee"); setPassword("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="mt-1" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className="mt-1" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "employee" | "supplier")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={loading || !email || !fullName || !password} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
