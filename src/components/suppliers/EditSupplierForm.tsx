"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updateSupplierAction } from "@/app/(dashboard)/suppliers/actions";
import type { Supplier } from "@/types/database";

interface EditSupplierFormProps {
  supplier: Supplier;
}

export default function EditSupplierForm({ supplier }: EditSupplierFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [contactInfo, setContactInfo] = useState(supplier.contact_info ?? "");
  const [isActive, setIsActive] = useState(supplier.is_active);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("أدخل اسم المورد");
      return;
    }
    setLoading(true);
    const result = await updateSupplierAction(supplier.id, {
      name: name.trim(),
      contact_info: contactInfo.trim() || undefined,
      is_active: isActive,
    });
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم تحديث المورد");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setName(supplier.name);
          setContactInfo(supplier.contact_info ?? "");
          setIsActive(supplier.is_active);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          تعديل
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل المورد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">اسم المورد</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-contact">معلومات التواصل</Label>
            <Input
              id="edit-contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="edit-active">نشط</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
