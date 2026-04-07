import api from '@/api/axios'
import type { PaginatedResponse } from '@/types/common'
import type {
  Category,
  InventoryItem,
  InventoryItemDetail,
  Location,
  Transaction,
} from '@/types/inventory'

// --- Items ---

export type GetItemsParams = {
  page?: number
  per_page?: number
  category_id?: string
  is_bookable?: boolean
  low_stock?: boolean
  search?: string
}

export type CreateItemBody = {
  sku: string
  name: string
  unit: string
  description?: string
  category_id?: string
  reorder_threshold?: number
  is_bookable?: boolean
}

export type UpdateItemBody = {
  version: number
  name?: string
  description?: string
  category_id?: string
  unit?: string
  reorder_threshold?: number
  is_bookable?: boolean
}

export async function getItems(
  params: GetItemsParams = {}
): Promise<PaginatedResponse<InventoryItem>> {
  const response = await api.get('/inventory/items', { params })
  return response.data
}

export async function getItemById(id: string): Promise<InventoryItemDetail> {
  const response = await api.get(`/inventory/items/${id}`)
  return response.data
}

export async function createItem(body: CreateItemBody): Promise<InventoryItem> {
  const response = await api.post('/inventory/items', body)
  return response.data
}

export async function updateItem(
  id: string,
  body: UpdateItemBody
): Promise<InventoryItem> {
  const response = await api.patch(`/inventory/items/${id}`, body)
  return response.data
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/inventory/items/${id}`)
}

// --- Categories ---

export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/inventory/categories')
  return response.data
}

export type CreateCategoryBody = {
  name: string
  parent_id?: string
}

export async function createCategory(
  body: CreateCategoryBody
): Promise<Category> {
  const response = await api.post('/inventory/categories', body)
  return response.data
}

// --- Locations ---

export async function getLocations(): Promise<Location[]> {
  const response = await api.get('/inventory/locations')
  return response.data
}

// --- Transactions ---

export type GetTransactionsParams = {
  item_id?: string
  location_id?: string
  type?: Transaction['type']
  performed_by?: string
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export type CreateTransactionBody = {
  item_id: string
  location_id: string
  type: Transaction['type']
  quantity_delta: number
  reference_id?: string
  reference_type?: string
  notes?: string
}

export async function getTransactions(
  params: GetTransactionsParams = {}
): Promise<PaginatedResponse<Transaction>> {
  const response = await api.get('/inventory/transactions', { params })
  return response.data
}

export async function createTransaction(
  body: CreateTransactionBody
): Promise<Transaction> {
  const response = await api.post('/inventory/transactions', body)
  return response.data
}