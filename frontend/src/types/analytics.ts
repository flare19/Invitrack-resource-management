// src/types/analytics.ts

export interface InventorySnapshot {
  snapshot_date: string
  item_id: string
  location_id: string
  quantity: number
  created_at: string
}

export interface BookingMetric {
  metric_date: string
  resource_id: string
  total_requests: number
  approved_count: number
  rejected_count: number
  utilization_minutes: number
  created_at: string
}

export interface GetInventorySnapshotsParams {
  item_id: string
  location_id?: string | undefined
  from?: string | undefined
  to?: string | undefined
}

export interface GetBookingMetricsParams {
  resource_id?: string | undefined
  from?: string | undefined
  to?: string | undefined
}