"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { STATUS_LABELS } from "@/lib/utils/constants";
import { bulkUpdateOrdersStatusAction } from "@/app/(dashboard)/orders/actions";
import { Loader2 } from "lucide-react";

interface BulkStatusActionProps {
  orderIds: string[];
  onClose: () => void;
}

export default function BulkStatusAction({ orderIds, onClose }: BulkStatusActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatus) {
      toast.error("Select a new status");
      return;
    }
    setLoading(true);
    const result = await bulkUpdateOrdersStatusAction(orderIds, newStatus);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Updated ${(result as { updated?: number }).updated ?? orderIds.length} items`);
    setOpen(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setOpen(false), onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Status Update</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {orderIds.length} orders selected — status will be applied to all items
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => (setOpen(false), onClose())}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newStatus} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
