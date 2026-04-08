export type Category = {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

export type Location = {
  id: string
  name: string
  description: string | null
  parent_id: string | null
}

export type StockLevel = {
  location_id: string
  location_name: string
  quantity: number
}

export type StockLevelDetail = {
  id: string
  item_id: string
  location_id: string
  location_name: string
  quantity: number
  updated_at: string
}

export type InventoryItem = {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  reorder_threshold: number
  is_bookable: boolean
  is_active: boolean
  version: number
  image_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type InventoryItemDetail = InventoryItem & {
  stock_levels: StockLevel[]
}

export type Transaction = {
  id: string
  item_id: string
  location_id: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity_delta: number
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  performed_by: string
  performed_at: string
}