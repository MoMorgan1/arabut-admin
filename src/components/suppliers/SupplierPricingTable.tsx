"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD } from "@/lib/utils/formatters";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSupplierPriceAction } from "@/app/(dashboard)/suppliers/pricing-actions";
import { useRouter } from "next/navigation";
import type { SupplierPrice } from "@/types/database";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  coins: "Coins (per million)",
  fut_rank: "FUT Rank",
  rivals: "Rivals",
  sbc_challenge: "SBC - Service (per challenge)",
};

interface SupplierPricingTableProps {
  prices: SupplierPrice[];
}

export default function SupplierPricingTable({ prices }: SupplierPricingTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(priceId: string) {
    if (!confirm("Delete this pricing rule?")) return;
    setDeleting(priceId);
    const result = await deleteSupplierPriceAction(priceId);
    setDeleting(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Price deleted");
    router.refresh();
  }

  if (!prices.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No pricing rules yet. Click "Add Price" to create one.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Service</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Price (USD)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prices.map((price) => {
            let details = "";
            if (price.service_type === "fut_rank" && price.rank_level) {
              details = `Rank ${price.rank_level}${price.is_fast_service ? " (Fast)" : ""}`;
            } else if (price.service_type === "rivals" && price.division_level) {
              details = `Division ${price.division_level}`;
            }

            return (
              <TableRow key={price.id}>
                <TableCell>{SERVICE_TYPE_LABELS[price.service_type] ?? price.service_type}</TableCell>
                <TableCell>{price.platform}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {details || "—"}
                </TableCell>
                <TableCell className="font-mono">{formatUSD(price.price_usd)}</TableCell>
                <TableCell>
                  <Badge variant={price.is_active ? "default" : "secondary"}>
                    {price.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(price.id)}
                    disabled={deleting === price.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
