"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar } from "lucide-react";
import { STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils/constants";
import type { OrderFilters as OrderFiltersType } from "@/types/orders";

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onChange: (filters: OrderFiltersType) => void;
  onReset: () => void;
}

function getDatePreset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function getThisMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  };
}

function getLastMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function OrderFilters({
  filters,
  onChange,
  onReset,
}: OrderFiltersProps) {
  function updateFilter(key: keyof OrderFiltersType, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function applyDatePreset(preset: { from: string; to: string }) {
    onChange({ ...filters, dateFrom: preset.from, dateTo: preset.to });
  }

  const hasActiveFilters =
    filters.search ||
    filters.status !== "active" ||
    filters.itemType !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Status + Type */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, order ID, or EA email..."
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
            <SelectItem value="active">Active (Not Completed)</SelectItem>
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

        {/* Reset */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: Date filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium">Date:</span>
        </div>

        {/* Quick presets */}
        <div className="flex gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => applyDatePreset(getDatePreset(7))}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => applyDatePreset(getDatePreset(30))}
          >
            Last 30 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => applyDatePreset(getThisMonth())}
          >
            This month
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => applyDatePreset(getLastMonth())}
          >
            Last month
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground whitespace-nowrap">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="w-[140px] h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground whitespace-nowrap">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="w-[140px] h-7 text-xs"
            />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              onClick={() => onChange({ ...filters, dateFrom: "", dateTo: "" })}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
