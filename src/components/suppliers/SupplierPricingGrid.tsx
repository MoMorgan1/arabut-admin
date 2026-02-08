"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import type { SupplierPrice } from "@/types/database";

interface DefaultPriceRow {
  service_type: string;
  platform: string;
  price_usd: number;
  rank_level?: number | null;
  division_level?: number | null;
  is_fast_service?: boolean;
  is_active: boolean;
}

interface SupplierPricingGridProps {
  supplierId: string;
  existingPrices: SupplierPrice[] | DefaultPriceRow[];
  isDefault?: boolean;
}

export default function SupplierPricingGrid({ supplierId, existingPrices, isDefault = false }: SupplierPricingGridProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State for all prices
  const [coinsPS, setCoinsPS] = useState("");
  const [coinsPC, setCoinsPC] = useState("");
  
  const [futPrices, setFutPrices] = useState<Record<string, { ps: string; pc: string }>>({});
  const [futFastPS, setFutFastPS] = useState("");
  const [futFastPC, setFutFastPC] = useState("");
  
  const [rivalsPrices, setRivalsPrices] = useState<Record<string, { ps: string; pc: string }>>({});
  
  const [sbcPrice, setSbcPrice] = useState("");

  // Initialize from existing prices
  useEffect(() => {
    existingPrices.forEach(price => {
      if (price.service_type === "coins") {
        if (price.platform === "PS") setCoinsPS(price.price_usd.toString());
        if (price.platform === "PC") setCoinsPC(price.price_usd.toString());
      }
      
      if (price.service_type === "fut_rank") {
        if (price.is_fast_service && price.rank_level === 0) {
          // This is the fast service FEE
          if (price.platform === "PS") setFutFastPS(price.price_usd.toString());
          if (price.platform === "PC") setFutFastPC(price.price_usd.toString());
        } else if (price.rank_level && price.rank_level > 0) {
          // Regular rank pricing
          setFutPrices(prev => ({
            ...prev,
            [price.rank_level!]: {
              ...prev[price.rank_level!],
              [price.platform.toLowerCase()]: price.price_usd.toString()
            }
          }));
        }
      }
      
      if (price.service_type === "rivals" && price.division_level) {
        setRivalsPrices(prev => ({
          ...prev,
          [price.division_level!]: {
            ...prev[price.division_level!],
            [price.platform.toLowerCase()]: price.price_usd.toString()
          }
        }));
      }
      
      if (price.service_type === "sbc_challenge") {
        setSbcPrice(price.price_usd.toString());
      }
    });
  }, [existingPrices]);

  async function handleSave() {
    setLoading(true);

    try {
      const tableName = isDefault ? "default_supplier_prices" : "supplier_prices";
      const pricesToInsert: any[] = [];

      const baseRow = (overrides: Record<string, unknown>) =>
        isDefault ? { ...overrides, is_active: true } : { ...overrides, supplier_id: supplierId, is_active: true };

      // Coins
      if (coinsPS) pricesToInsert.push(baseRow({
        service_type: "coins",
        platform: "PS",
        price_usd: parseFloat(coinsPS),
      }));
      if (coinsPC) pricesToInsert.push(baseRow({
        service_type: "coins",
        platform: "PC",
        price_usd: parseFloat(coinsPC),
      }));

      // FUT Ranks (normal)
      for (let rank = 1; rank <= 6; rank++) {
        const prices = futPrices[rank] || {};
        if (prices.ps) pricesToInsert.push(baseRow({
          service_type: "fut_rank",
          platform: "PS",
          rank_level: rank,
          is_fast_service: false,
          price_usd: parseFloat(prices.ps),
        }));
        if (prices.pc) pricesToInsert.push(baseRow({
          service_type: "fut_rank",
          platform: "PC",
          rank_level: rank,
          is_fast_service: false,
          price_usd: parseFloat(prices.pc),
        }));
      }

      // FUT Fast Service Fee (stored with rank_level = 0 to identify it as the fee)
      if (futFastPS) {
        pricesToInsert.push(baseRow({
          service_type: "fut_rank",
          platform: "PS",
          rank_level: 0,
          is_fast_service: true,
          price_usd: parseFloat(futFastPS),
        }));
      }
      if (futFastPC) {
        pricesToInsert.push(baseRow({
          service_type: "fut_rank",
          platform: "PC",
          rank_level: 0,
          is_fast_service: true,
          price_usd: parseFloat(futFastPC),
        }));
      }

      // Rivals
      for (let div = 1; div <= 10; div++) {
        const prices = rivalsPrices[div] || {};
        if (prices.ps) pricesToInsert.push(baseRow({
          service_type: "rivals",
          platform: "PS",
          division_level: div,
          price_usd: parseFloat(prices.ps),
        }));
        if (prices.pc) pricesToInsert.push(baseRow({
          service_type: "rivals",
          platform: "PC",
          division_level: div,
          price_usd: parseFloat(prices.pc),
        }));
      }

      // SBC (same for both platforms)
      if (sbcPrice) {
        const sbcVal = parseFloat(sbcPrice);
        pricesToInsert.push(baseRow({
          service_type: "sbc_challenge",
          platform: "PS",
          price_usd: sbcVal,
        }));
        pricesToInsert.push(baseRow({
          service_type: "sbc_challenge",
          platform: "PC",
          price_usd: sbcVal,
        }));
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (isDefault) {
        const { data: existing } = await supabase.from("default_supplier_prices").select("id");
        if (existing && existing.length > 0) {
          const { error: deleteErr } = await supabase.from("default_supplier_prices").delete().in("id", existing.map((r: { id: string }) => r.id));
          if (deleteErr) {
            toast.error(deleteErr.message);
            setLoading(false);
            return;
          }
        }
      } else {
        await supabase.from("supplier_prices").delete().eq("supplier_id", supplierId);
      }

      if (pricesToInsert.length > 0) {
        const { error } = await supabase.from(tableName).insert(pricesToInsert);

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
      }

      toast.success("Prices saved successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save prices");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Coins */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Coins (Price per Million)</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium">Service</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PS (USD)</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PC (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-4 text-sm">Coins</td>
                <td className="py-2 px-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coinsPS}
                    onChange={(e) => setCoinsPS(e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td className="py-2 px-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coinsPC}
                    onChange={(e) => setCoinsPC(e.target.value)}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FUT Rank */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">FUT Rank</h3>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium">Rank</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PS (USD)</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PC (USD)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, i) => i + 1).map(rank => (
                <tr key={rank} className="border-b">
                  <td className="py-2 px-4 text-sm">Rank {rank}</td>
                  <td className="py-2 px-4">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={futPrices[rank]?.ps || ""}
                      onChange={(e) => setFutPrices(prev => ({
                        ...prev,
                        [rank]: { ...prev[rank], ps: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={futPrices[rank]?.pc || ""}
                      onChange={(e) => setFutPrices(prev => ({
                        ...prev,
                        [rank]: { ...prev[rank], pc: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              ))}
              
              <tr className="border-b-2 border-t-2 bg-muted/30">
                <td className="py-2 px-4 text-sm font-medium">
                  <div>Fast Service Fee</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Added to base rank price
                  </div>
                </td>
                <td className="py-2 px-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={futFastPS}
                    onChange={(e) => setFutFastPS(e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td className="py-2 px-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={futFastPC}
                    onChange={(e) => setFutFastPC(e.target.value)}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Example: Rank 3 PS = $50, Fast Fee PS = $20 → Rank 3 with Fast = $50 + $20 = $70
        </p>
      </div>

      {/* Rivals */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Rivals</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium">Division</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PS (USD)</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">PC (USD)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(div => (
                <tr key={div} className="border-b">
                  <td className="py-2 px-4 text-sm">Division {div}</td>
                  <td className="py-2 px-4">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rivalsPrices[div]?.ps || ""}
                      onChange={(e) => setRivalsPrices(prev => ({
                        ...prev,
                        [div]: { ...prev[div], ps: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rivalsPrices[div]?.pc || ""}
                      onChange={(e) => setRivalsPrices(prev => ({
                        ...prev,
                        [div]: { ...prev[div], pc: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SBC */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">SBC Service (Per Challenge)</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium">Service</th>
                <th className="py-2 px-4 text-left text-sm font-medium w-32">Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-4 text-sm">SBC Challenge (same for PS & PC)</td>
                <td className="py-2 px-4">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sbcPrice}
                    onChange={(e) => setSbcPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={loading} size="lg" className="gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Save All Prices
        </Button>
      </div>
    </div>
  );
}
