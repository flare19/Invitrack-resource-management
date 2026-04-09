// src/hooks/useAnalytics.ts

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getInventorySnapshots, getBookingMetrics } from '@/api/analytics'
import type {
  InventorySnapshot,
  BookingMetric,
  GetInventorySnapshotsParams,
  GetBookingMetricsParams,
} from '@/types/analytics'

// --- Query keys ---

export const analyticsKeys = {
  all: ['analytics'] as const,
  inventorySnapshots: (params: GetInventorySnapshotsParams) =>
    [...analyticsKeys.all, 'inventory', 'snapshots', params] as const,
  bookingMetrics: (params: GetBookingMetricsParams) =>
    [...analyticsKeys.all, 'bookings', 'metrics', params] as const,
}

// --- Hooks ---

export function useInventorySnapshots(
  params: GetInventorySnapshotsParams,
  options?: Omit<UseQueryOptions<InventorySnapshot[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.inventorySnapshots(params),
    queryFn: () => getInventorySnapshots(params),
    enabled: !!params.item_id,
    ...options,
  })
}

export function useBookingMetrics(
  params: GetBookingMetricsParams,
  options?: Omit<UseQueryOptions<BookingMetric[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.bookingMetrics(params),
    queryFn: () => getBookingMetrics(params),
    ...options,
  })
}