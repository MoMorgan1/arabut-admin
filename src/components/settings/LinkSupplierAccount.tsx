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
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSupplierAccountAction } from "@/app/(dashboard)/settings/actions";

interface Props {
  suppliers: { id: string; name: string; user_id: string | null }[];
}

export default function LinkSupplierAccount({ suppliers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const unlinked = suppliers.filter((s) => !s.user_id);

  async function handleSubmit() {
    setLoading(true);
    const result = await createSupplierAccountAction({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      supplier_id: supplierId,
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Supplier account created and linked");
    setOpen(false);
    setSupplierId(""); setEmail(""); setPassword(""); setFullName("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2" disabled={unlinked.length === 0}>
          <Link2 className="h-4 w-4" /> Link Supplier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Supplier Login</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Supplier</Label>
            {unlinked.length === 0 ? (
              <p className="text-sm text-muted-foreground">All suppliers already have accounts</p>
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {unlinked.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Display Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Supplier name" className="mt-1" />
          </div>
          <div>
            <Label>Email (for login)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" className="mt-1" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className="mt-1" />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !supplierId || !email || !password || !fullName} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create & Link Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
