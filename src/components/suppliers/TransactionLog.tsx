import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatUSD, formatDateTime } from "@/lib/utils/formatters";
import type { SupplierTransaction } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  deduction: "Deduction",
  refund: "Refund",
  adjustment: "Adjustment",
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  deposit: "default",
  deduction: "destructive",
  refund: "secondary",
  adjustment: "outline",
};

interface TransactionLogProps {
  transactions: SupplierTransaction[];
}

export default function TransactionLog({ transactions }: TransactionLogProps) {
  if (!transactions.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">No transactions</p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance After</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                <Badge variant={TYPE_VARIANT[tx.type] ?? "secondary"}>
                  {TYPE_LABELS[tx.type] ?? tx.type}
                </Badge>
              </TableCell>
              <TableCell
                className={
                  tx.type === "deposit" || tx.type === "refund"
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}
                {formatUSD(tx.amount)}
              </TableCell>
              <TableCell>{formatUSD(tx.balance_after)}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {tx.note ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(tx.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
