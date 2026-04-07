import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  createCategory,
  createItem,
  createTransaction,
  deleteItem,
  getCategories,
  getItemById,
  getItems,
  getLocations,
  getTransactions,
  updateItem,
  type CreateCategoryBody,
  type CreateItemBody,
  type CreateTransactionBody,
  type GetItemsParams,
  type GetTransactionsParams,
  type UpdateItemBody,
} from '@/api/inventory'
import type { PaginatedResponse } from '@/types/common'
import type {
  Category,
  InventoryItem,
  InventoryItemDetail,
  Location,
  Transaction,
} from '@/types/inventory'

// --- Query keys ---

export const inventoryKeys = {
  all: ['inventory'] as const,
  items: () => [...inventoryKeys.all, 'items'] as const,
  item: (id: string) => [...inventoryKeys.all, 'items', id] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  locations: () => [...inventoryKeys.all, 'locations'] as const,
  transactions: () => [...inventoryKeys.all, 'transactions'] as const,
}

// --- Items ---

export function useItems(
  params: GetItemsParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<InventoryItem>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...inventoryKeys.items(), params],
    queryFn: () => getItems(params),
    ...options,
  })
}

export function useItem(
  id: string,
  options?: Omit <
    UseQueryOptions<InventoryItemDetail>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: () => getItemById(id),
    ...options,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateItemBody) => createItem(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
    },
  })
}

export function useUpdateItem(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateItemBody) => updateItem(id, body),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.setQueryData(inventoryKeys.item(id), (old: InventoryItemDetail | undefined) => {
        if (!old) return old
        return { ...old, ...updatedItem }
      })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.removeQueries({ queryKey: inventoryKeys.item(id) })
    },
  })
}

// --- Categories ---

export function useCategories(
  options?: Omit<UseQueryOptions<Category[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: getCategories,
    ...options,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateCategoryBody) => createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() })
    },
  })
}

// --- Locations ---

export function useLocations(
  options?: Omit<UseQueryOptions<Location[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: inventoryKeys.locations(),
    queryFn: getLocations,
    ...options,
  })
}

// --- Transactions ---

export function useTransactions(
  params: GetTransactionsParams = {},
  options?: Omit <
    UseQueryOptions<PaginatedResponse<Transaction>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...inventoryKeys.transactions(), params],
    queryFn: () => getTransactions(params),
    ...options,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTransactionBody) => createTransaction(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() })
    },
  })
}