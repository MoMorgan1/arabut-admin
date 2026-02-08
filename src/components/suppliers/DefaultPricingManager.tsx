"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";

interface DefaultPricingManagerProps {
  suppliers: Array<{ id: string; display_name: string }>;
}

export default function DefaultPricingManager({ suppliers }: DefaultPricingManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCopyToAll() {
    if (!confirm(`Copy default pricing to ALL ${suppliers.length} suppliers? This will overwrite their existing pricing.`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch("/api/suppliers/copy-default-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || "Failed to copy pricing");
        return;
      }

      toast.success(`Pricing copied to ${result.count} suppliers`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Pricing to All Suppliers
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Default Pricing</DialogTitle>
          <DialogDescription>
            This will copy all default pricing rules to every supplier. Their existing pricing will be overwritten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">What will happen:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All default pricing rules will be copied</li>
              <li>Applied to all {suppliers.length} active suppliers</li>
              <li>Existing pricing will be replaced</li>
              <li>Each supplier can then customize their own pricing</li>
            </ul>
          </div>
          
          <Button
            onClick={handleCopyToAll}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Copy to All {suppliers.length} Suppliers
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
