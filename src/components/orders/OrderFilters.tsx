"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils/constants";
import type { OrderFilters as OrderFiltersType } from "@/types/orders";

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onChange: (filters: OrderFiltersType) => void;
  onReset: () => void;
}

export default function OrderFilters({
  filters,
  onChange,
  onReset,
}: OrderFiltersProps) {
  function updateFilter(key: keyof OrderFiltersType, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.itemType !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or order ID..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <Select
        value={filters.status}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select
        value={filters.itemType}
        onValueChange={(v) => updateFilter("itemType", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {Object.entries(ORDER_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date from */}
      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => updateFilter("dateFrom", e.target.value)}
        className="w-[160px]"
      />

      {/* Date to */}
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => updateFilter("dateTo", e.target.value)}
        className="w-[160px]"
      />

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
