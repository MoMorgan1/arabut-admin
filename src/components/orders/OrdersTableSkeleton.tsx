"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROWS = 10;

export default function OrdersTableSkeleton() {
  return (
    <>
      {/* Desktop: table skeleton */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[44px]">
              <div className="h-4 w-4 rounded border bg-muted" />
            </TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>EA Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Qty / Delivered</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: ROWS }).map((_, i) => (
            <TableRow key={i} className="animate-pulse">
              <TableCell>
                <div className="h-4 w-4 rounded border bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-12 rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/80" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <div className="h-5 w-14 rounded bg-muted" />
                  <div className="h-5 w-12 rounded bg-muted" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-16 rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-16 rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-20 rounded bg-muted" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

      {/* Mobile: card skeletons */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 animate-pulse space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-6 w-14 rounded bg-muted" />
              <div className="h-6 w-12 rounded bg-muted" />
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <div className="h-5 w-20 rounded bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
