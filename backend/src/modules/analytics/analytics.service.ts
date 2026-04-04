// src/modules/analytics/analytics.service.ts

import { AppError } from '../../errors/AppError';
import {
  findInventorySnapshots,
  findBookingMetrics,
  findAllStockLevels,
  findReservationsForDate,
  upsertInventorySnapshot,
  upsertBookingMetric,
} from './analytics.repository';
import {
  DailyInventorySnapshotDTO,
  BookingMetricDTO,
  InventorySnapshotsQueryDTO,
  BookingMetricsQueryDTO,
} from './analytics.types';

// ─── Read services ────────────────────────────────────────────────────────────

export async function getInventorySnapshotsService(
  query: InventorySnapshotsQueryDTO
): Promise<DailyInventorySnapshotDTO[]> {
  if (!query.item_id) {
    throw new AppError(400, 'VALIDATION_ERROR', 'item_id is required.');
  }
  return findInventorySnapshots(query);
}

export async function getBookingMetricsService(
  query: BookingMetricsQueryDTO
): Promise<BookingMetricDTO[]> {
  return findBookingMetrics(query);
}

// ─── Job services ─────────────────────────────────────────────────────────────

export async function runInventorySnapshotJob(date: Date): Promise<void> {
  const stockLevels = await findAllStockLevels();

  if (stockLevels.length === 0) {
    console.log('[analytics] No stock levels found, skipping inventory snapshot job.');
    return;
  }

  await Promise.all(
    stockLevels.map((sl) =>
      upsertInventorySnapshot({
        snapshotDate: date,
        itemId: sl.itemId,
        locationId: sl.locationId,
        quantity: sl.quantity,
      })
    )
  );

  console.log(`[analytics] Inventory snapshot job completed for ${date.toISOString().split('T')[0]}.`);
}

export async function runBookingMetricsJob(date: Date): Promise<void> {
  const reservations = await findReservationsForDate(date);

  if (reservations.length === 0) {
    console.log('[analytics] No reservations found, skipping booking metrics job.');
    return;
  }

  // Group by resourceId
  const grouped = new Map<string, { totalRequests: number; approvedCount: number; rejectedCount: number; utilizationMinutes: number }>();

  for (const r of reservations) {
    const existing = grouped.get(r.resourceId) ?? {
      totalRequests: 0,
      approvedCount: 0,
      rejectedCount: 0,
      utilizationMinutes: 0,
    };

    existing.totalRequests += 1;

    if (r.status === 'approved') {
      existing.approvedCount += 1;
      const minutes = Math.round(
        (r.endTime.getTime() - r.startTime.getTime()) / 60000
      );
      existing.utilizationMinutes += minutes;
    }

    if (r.status === 'rejected') {
      existing.rejectedCount += 1;
    }

    grouped.set(r.resourceId, existing);
  }

  await Promise.all(
    Array.from(grouped.entries()).map(([resourceId, metrics]) =>
      upsertBookingMetric({
        metricDate: date,
        resourceId,
        ...metrics,
      })
    )
  );

  console.log(`[analytics] Booking metrics job completed for ${date.toISOString().split('T')[0]}.`);
}