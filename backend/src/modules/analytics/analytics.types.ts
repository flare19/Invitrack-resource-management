// src/modules/analytics/analytics.types.ts

export interface DailyInventorySnapshotDTO {
  snapshot_date: string;
  item_id: string;
  location_id: string;
  quantity: number;
  created_at: Date;
}

export interface BookingMetricDTO {
  metric_date: string;
  resource_id: string;
  total_requests: number;
  approved_count: number;
  rejected_count: number;
  utilization_minutes: number;
  created_at: Date;
}

export interface InventorySnapshotsQueryDTO {
  item_id: string;
  location_id?: string;
  from?: string;
  to?: string;
}

export interface BookingMetricsQueryDTO {
  resource_id?: string;
  from?: string;
  to?: string;
}