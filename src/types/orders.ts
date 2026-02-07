// Order-specific types used across the app

export interface OrderFilters {
  search: string;
  status: string;
  itemType: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  status: "active",
  itemType: "all",
  dateFrom: "",
  dateTo: "",
};

// Terminal statuses — orders with ALL items in these statuses are considered "done"
export const TERMINAL_STATUSES = ["completed", "completed_comp", "cancelled", "refunded"];
