// src/api/analytics.ts

import api from './axios'
import type {
  InventorySnapshot,
  BookingMetric,
  GetInventorySnapshotsParams,
  GetBookingMetricsParams,
} from '@/types/analytics'

export async function getInventorySnapshots(
  params: GetInventorySnapshotsParams
): Promise<InventorySnapshot[]> {
  const response = await api.get<InventorySnapshot[]>('/analytics/inventory/snapshots', { params })
  return response.data
}

export async function getBookingMetrics(
  params: GetBookingMetricsParams
): Promise<BookingMetric[]> {
  const response = await api.get<BookingMetric[]>('/analytics/bookings/metrics', { params })
  return response.data
}