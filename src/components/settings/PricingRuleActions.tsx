"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePricingRuleAction, deletePricingRuleAction } from "@/app/(dashboard)/settings/actions";

interface Props {
  rule: {
    id: string;
    price_per_million_usd: number;
    min_amount_k: number;
    max_amount_k: number | null;
  };
}

export default function PricingRuleActions({ rule }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(String(rule.price_per_million_usd));
  const [minK, setMinK] = useState(String(rule.min_amount_k));
  const [maxK, setMaxK] = useState(rule.max_amount_k ? String(rule.max_amount_k) : "");

  async function handleUpdate() {
    setLoading(true);
    const result = await updatePricingRuleAction(rule.id, {
      price_per_million_usd: parseFloat(price) || rule.price_per_million_usd,
      min_amount_k: parseInt(minK) || 0,
      max_amount_k: maxK ? parseInt(maxK) : null,
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Rule updated");
    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    setLoading(true);
    const result = await deletePricingRuleAction(rule.id);
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Rule deleted");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">From (K)</label>
                <Input type="number" value={minK} onChange={(e) => setMinK(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">To (K)</label>
                <Input type="number" value={maxK} onChange={(e) => setMaxK(e.target.value)} placeholder="Unlimited" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">$/Million</label>
              <Input type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleUpdate} disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
