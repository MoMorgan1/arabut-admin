"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateSystemSettingAction } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

interface ExchangeRateSettingProps {
  currentRate: string;
}

export default function ExchangeRateSetting({ currentRate }: ExchangeRateSettingProps) {
  const router = useRouter();
  const [rate, setRate] = useState(currentRate);
  const [savedRate, setSavedRate] = useState(currentRate);
  const [loading, setLoading] = useState(false);

  // Sync state when server props change (after router.refresh)
  useEffect(() => {
    setRate(currentRate);
    setSavedRate(currentRate);
  }, [currentRate]);

  const hasChanged = rate !== savedRate;

  async function handleSave() {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Exchange rate must be a number greater than zero");
      return;
    }

    setLoading(true);
    const result = await updateSystemSettingAction("exchange_rate", rate);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Exchange rate saved: ${result.savedValue}`);
    setSavedRate(rate);
    router.refresh();
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 max-w-[200px]">
        <Label className="text-sm">Rate (USD → SAR)</Label>
        <Input
          type="number"
          step="0.0001"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="mt-1 font-mono"
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={loading || !hasChanged}
        size="sm"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Save
      </Button>
      <p className="text-xs text-muted-foreground self-center">
        Applied to all orders for USD → SAR cost conversion
      </p>
    </div>
  );
}
