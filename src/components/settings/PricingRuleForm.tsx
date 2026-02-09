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
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addPricingRuleAction } from "@/app/(dashboard)/settings/actions";

export default function PricingRuleForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("PS");
  const [shippingType, setShippingType] = useState("fast");
  const [minK, setMinK] = useState("");
  const [maxK, setMaxK] = useState("");
  const [price, setPrice] = useState("");

  async function handleSubmit() {
    setLoading(true);
    const result = await addPricingRuleAction({
      platform,
      shipping_type: shippingType,
      min_amount_k: parseInt(minK) || 0,
      max_amount_k: maxK ? parseInt(maxK) : null,
      price_per_million_usd: parseFloat(price) || 0,
    });
    setLoading(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Rule added");
    setOpen(false);
    setPlatform("PS"); setShippingType("fast");
    setMinK(""); setMaxK(""); setPrice("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pricing Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PS">PlayStation</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shipping Type</Label>
              <Select value={shippingType} onValueChange={setShippingType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From (K)</Label>
              <Input type="number" value={minK} onChange={(e) => setMinK(e.target.value)} placeholder="0" className="mt-1" />
            </div>
            <div>
              <Label>To (K) — leave empty for unlimited</Label>
              <Input type="number" value={maxK} onChange={(e) => setMaxK(e.target.value)} placeholder="Unlimited" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>$/Million (USD)</Label>
            <Input type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="14" className="mt-1" />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !price} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
