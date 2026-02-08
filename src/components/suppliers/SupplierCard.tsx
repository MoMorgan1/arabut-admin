import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/utils/formatters";
import { ChevronRight } from "lucide-react";
import type { Supplier } from "@/types/database";

interface SupplierCardProps {
  supplier: Supplier;
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="font-semibold">{supplier.display_name}</span>
          {!supplier.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatUSD(supplier.balance)}</p>
          <p className="text-xs text-muted-foreground">Current Balance</p>
          {supplier.contact_info && (
            <p className="text-sm text-muted-foreground mt-2 truncate">
              {supplier.contact_info}
            </p>
          )}
          <Button variant="ghost" size="sm" className="mt-2 gap-1 w-full justify-start">
            Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
