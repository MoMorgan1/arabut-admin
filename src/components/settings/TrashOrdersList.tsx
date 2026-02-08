"use client";

import { useState } from "react";
import { formatDate, formatSAR } from "@/lib/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { restoreOrderAction, permanentlyDeleteOrderAction } from "@/app/(dashboard)/orders/actions";

interface DeletedOrderWithItems {
  id: string;
  salla_order_id: string;
  customer_name: string;
  salla_total_sar: number | null;
  status: string;
  order_date: string;
  deleted_at: string;
  deleted_order_items: Array<{
    id: string;
    product_name: string;
  }>;
}

interface TrashOrdersListProps {
  deletedOrders: DeletedOrderWithItems[];
}

export default function TrashOrdersList({ deletedOrders }: TrashOrdersListProps) {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleRestore(orderId: string) {
    setRestoring(orderId);
    const result = await restoreOrderAction(orderId);
    setRestoring(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Order restored successfully");
    }
  }

  async function handlePermanentDelete() {
    if (!orderToDelete) return;

    setDeleting(true);
    const result = await permanentlyDeleteOrderAction(orderToDelete);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setOrderToDelete(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Order permanently deleted");
    }
  }

  if (!deletedOrders.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders in trash. Deleted orders will appear here.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deletedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">
                  #{order.salla_order_id}
                </TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>
                  {order.salla_total_sar ? formatSAR(order.salla_total_sar) : "—"}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {order.deleted_order_items?.length || 0} item(s)
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(order.deleted_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{order.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(order.id)}
                      disabled={restoring === order.id}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {restoring === order.id ? "Restoring..." : "Restore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setOrderToDelete(order.id);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={restoring === order.id}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Order?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The order and all its items will be
              permanently removed from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
