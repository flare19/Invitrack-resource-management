// ============================================================
// Category DTOs
// ============================================================

export interface CategoryDTO {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: Date;
}

export interface CreateCategoryDTO {
  name: string;
  parent_id?: string;
}

// ============================================================
// Location DTOs
// ============================================================

export interface LocationDTO {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
}

export interface CreateLocationDTO {
  name: string;
  description?: string;
  parent_id?: string;
}

// ============================================================
// Item DTOs
// ============================================================

export interface StockLevelDTO {
  location_id: string;
  location_name: string;
  quantity: number;
}

export interface ItemDTO {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit: string;
  reorder_threshold: number;
  is_bookable: boolean;
  is_active: boolean;
  version: number;
  image_url: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ItemDetailDTO extends ItemDTO {
  stock_levels: StockLevelDTO[];
}

export interface CreateItemDTO {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  unit: string;
  reorder_threshold?: number;
  is_bookable?: boolean;
}

export interface UpdateItemDTO {
  version: number;
  name?: string;
  description?: string;
  category_id?: string;
  unit?: string;
  reorder_threshold?: number;
  is_bookable?: boolean;
}

export interface ListItemsQueryDTO {
  page?: number;
  per_page?: number;
  category_id?: string;
  is_bookable?: boolean;
  low_stock?: boolean;
  search?: string;
}

// ============================================================
// Stock DTOs
// ============================================================

export interface StockLevelDetailDTO {
  id: string;
  item_id: string;
  location_id: string;
  location_name: string;
  quantity: number;
  updated_at: Date;
}

// ============================================================
// Transaction DTOs
// ============================================================

export type TransactionType = 'in' | 'out' | 'adjustment' | 'transfer';

export interface TransactionDTO {
  id: string;
  item_id: string;
  location_id: string;
  type: TransactionType;
  quantity_delta: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  performed_by: string;
  performed_at: Date;
}

export interface CreateTransactionDTO {
  item_id: string;
  location_id: string;
  type: TransactionType;
  quantity_delta: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
}

export interface ListTransactionsQueryDTO {
  item_id?: string;
  location_id?: string;
  type?: TransactionType;
  performed_by?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}