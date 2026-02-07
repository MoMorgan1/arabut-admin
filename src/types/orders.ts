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
  status: "all",
  itemType: "all",
  dateFrom: "",
  dateTo: "",
};
