// src/modules/analytics/analytics.repository.ts

import prisma from '../../config/prisma';
import {
  DailyInventorySnapshotDTO,
  BookingMetricDTO,
  InventorySnapshotsQueryDTO,
  BookingMetricsQueryDTO,
} from './analytics.types';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatSnapshot(snapshot: {
  snapshotDate: Date;
  itemId: string;
  locationId: string;
  quantity: number;
  createdAt: Date;
}): DailyInventorySnapshotDTO {
  return {
    snapshot_date: snapshot.snapshotDate.toISOString().split('T')[0] as string,
    item_id: snapshot.itemId,
    location_id: snapshot.locationId,
    quantity: snapshot.quantity,
    created_at: snapshot.createdAt,
  };
}

function formatBookingMetric(metric: {
  metricDate: Date;
  resourceId: string;
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  utilizationMinutes: number;
  createdAt: Date;
}): BookingMetricDTO {
  return {
    metric_date: metric.metricDate.toISOString().split('T')[0] as string,
    resource_id: metric.resourceId,
    total_requests: metric.totalRequests,
    approved_count: metric.approvedCount,
    rejected_count: metric.rejectedCount,
    utilization_minutes: metric.utilizationMinutes,
    created_at: metric.createdAt,
  };
}

// ─── Read queries ─────────────────────────────────────────────────────────────

export async function findInventorySnapshots(
  query: InventorySnapshotsQueryDTO
): Promise<DailyInventorySnapshotDTO[]> {
  const snapshots = await prisma.dailyInventorySnapshot.findMany({
    where: {
      itemId: query.item_id,
      ...(query.location_id !== undefined && { locationId: query.location_id }),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            snapshotDate: {
              ...(query.from !== undefined && { gte: new Date(query.from) }),
              ...(query.to !== undefined && { lte: new Date(query.to) }),
            },
          }
        : {}),
    },
    orderBy: { snapshotDate: 'asc' },
  });

  return snapshots.map(formatSnapshot);
}

export async function findBookingMetrics(
  query: BookingMetricsQueryDTO
): Promise<BookingMetricDTO[]> {
  const metrics = await prisma.bookingMetric.findMany({
    where: {
      ...(query.resource_id !== undefined && { resourceId: query.resource_id }),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            metricDate: {
              ...(query.from !== undefined && { gte: new Date(query.from) }),
              ...(query.to !== undefined && { lte: new Date(query.to) }),
            },
          }
        : {}),
    },
    orderBy: { metricDate: 'asc' },
  });

  return metrics.map(formatBookingMetric);
}

// ─── Job upserts ──────────────────────────────────────────────────────────────

export async function upsertInventorySnapshot(data: {
  snapshotDate: Date;
  itemId: string;
  locationId: string;
  quantity: number;
}): Promise<void> {
  await prisma.dailyInventorySnapshot.upsert({
    where: {
      snapshotDate_itemId_locationId: {
        snapshotDate: data.snapshotDate,
        itemId: data.itemId,
        locationId: data.locationId,
      },
    },
    update: { quantity: data.quantity },
    create: {
      snapshotDate: data.snapshotDate,
      itemId: data.itemId,
      locationId: data.locationId,
      quantity: data.quantity,
    },
  });
}

export async function upsertBookingMetric(data: {
  metricDate: Date;
  resourceId: string;
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  utilizationMinutes: number;
}): Promise<void> {
  await prisma.bookingMetric.upsert({
    where: {
      metricDate_resourceId: {
        metricDate: data.metricDate,
        resourceId: data.resourceId,
      },
    },
    update: {
      totalRequests: data.totalRequests,
      approvedCount: data.approvedCount,
      rejectedCount: data.rejectedCount,
      utilizationMinutes: data.utilizationMinutes,
    },
    create: {
      metricDate: data.metricDate,
      resourceId: data.resourceId,
      totalRequests: data.totalRequests,
      approvedCount: data.approvedCount,
      rejectedCount: data.rejectedCount,
      utilizationMinutes: data.utilizationMinutes,
    },
  });
}

// ─── Job read sources ─────────────────────────────────────────────────────────

export async function findAllStockLevels() {
  return prisma.stockLevel.findMany({
    select: {
      itemId: true,
      locationId: true,
      quantity: true,
    },
  });
}

export async function findReservationsForDate(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  return prisma.reservation.findMany({
    where: {
      startTime: {
        gte: start,
        lte: end,
      },
    },
    select: {
      resourceId: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  });
}