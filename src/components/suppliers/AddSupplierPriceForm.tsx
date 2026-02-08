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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { addSupplierPriceAction } from "@/app/(dashboard)/suppliers/pricing-actions";

interface AddSupplierPriceFormProps {
  supplierId: string;
  isArabic?: boolean;
}

export default function AddSupplierPriceForm({ supplierId, isArabic = false }: AddSupplierPriceFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<"coins" | "fut_rank" | "rivals" | "sbc_challenge">("coins");
  const [platform, setPlatform] = useState<"PS" | "PC">("PS");
  const [price, setPrice] = useState("");
  const [rankLevel, setRankLevel] = useState<number | undefined>(undefined);
  const [divisionLevel, setDivisionLevel] = useState<number | undefined>(undefined);
  const [isFastService, setIsFastService] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setLoading(true);
    
    // Determine if we're adding to default pricing or a specific supplier
    const isDefault = supplierId === "default";
    const tableName = isDefault ? "default_supplier_prices" : "supplier_prices";
    
    const insertData: any = {
      service_type: serviceType,
      platform,
      price_usd: priceNum,
      rank_level: serviceType === "fut_rank" ? rankLevel : undefined,
      division_level: serviceType === "rivals" ? divisionLevel : undefined,
      is_fast_service: serviceType === "fut_rank" ? isFastService : undefined,
      is_active: true,
    };
    
    // Only add supplier_id if not default
    if (!isDefault) {
      insertData.supplier_id = supplierId;
    }

    // Use direct supabase call instead of action for flexibility
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    
    const { error } = await supabase.from(tableName).insert(insertData);
    
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isDefault ? "Default price added" : "Price added");
    setOpen(false);
    setPrice("");
    setRankLevel(undefined);
    setDivisionLevel(undefined);
    setIsFastService(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {isArabic ? "إضافة سعر" : "Add Price"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isArabic ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isArabic ? "إضافة سعر جديد" : "Add Pricing Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{isArabic ? "نوع الخدمة" : "Service Type"}</Label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as typeof serviceType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coins">
                  {isArabic ? "كوينز (سعر المليون)" : "Coins (price per million)"}
                </SelectItem>
                <SelectItem value="fut_rank">
                  {isArabic ? "رتبة الفوت" : "FUT Rank"}
                </SelectItem>
                <SelectItem value="rivals">
                  {isArabic ? "رايفلز" : "Rivals"}
                </SelectItem>
                <SelectItem value="sbc_challenge">
                  {isArabic ? "SBC - خدمة التشالنج" : "SBC - Service (per challenge)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{isArabic ? "المنصة" : "Platform"}</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PS">PlayStation</SelectItem>
                <SelectItem value="PC">PC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {serviceType === "fut_rank" && (
            <>
              <div>
                <Label>Rank Level</Label>
                <Select value={rankLevel?.toString() ?? ""} onValueChange={(v) => setRankLevel(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Rank 1</SelectItem>
                    <SelectItem value="2">Rank 2</SelectItem>
                    <SelectItem value="3">Rank 3</SelectItem>
                    <SelectItem value="4">Rank 4</SelectItem>
                    <SelectItem value="5">Rank 5</SelectItem>
                    <SelectItem value="6">Rank 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fast-service"
                  checked={isFastService}
                  onCheckedChange={(checked) => setIsFastService(!!checked)}
                />
                <Label htmlFor="fast-service" className="cursor-pointer">
                  Fast Service (priority)
                </Label>
              </div>
            </>
          )}

          {serviceType === "rivals" && (
            <div>
              <Label>Division Level</Label>
              <Select value={divisionLevel?.toString() ?? ""} onValueChange={(v) => setDivisionLevel(parseInt(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((div) => (
                    <SelectItem key={div} value={div.toString()}>
                      Division {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="price">
              Price (USD)
              {serviceType === "coins" && " per million"}
              {serviceType === "sbc_challenge" && " per challenge"}
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              className="mt-1"
            />
            {serviceType === "coins" && (
              <p className="text-xs text-muted-foreground mt-1">
                Example: If you enter $15, a 100K order will cost $1.50. This same rate applies to both regular coins orders and SBC coins.
              </p>
            )}
            {serviceType === "sbc_challenge" && (
              <p className="text-xs text-muted-foreground mt-1">
                Example: If you enter $5, completing 4 challenges will cost $20
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
