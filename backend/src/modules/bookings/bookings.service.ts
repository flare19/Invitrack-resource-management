import { AppError } from '../../errors/AppError';
import prisma from '../../config/prisma';
import {
  findAllResources,
  findResourceById,
  findResourceWithItem,
  createResource,
  updateResource,
  findItemForBooking,
  getOverlappingQuantity,
  findUserHighestPriority,
  findReservations,
  findReservationById,
  updateReservation,
} from './bookings.repository';
import {
  ResourceDTO,
  CreateResourceDTO,
  UpdateResourceDTO,
  CreateReservationDTO,
  AvailabilityDTO,
  ReservationDTO,
  UpdateReservationDTO,
  ReviewReservationDTO,
} from './bookings.types';

import { createAuditEvent } from '../audit/audit.service';
// ============================================================
// Mappers
// ============================================================

function formatResource(
  resource: NonNullable<Awaited<ReturnType<typeof findResourceById>>>
): ResourceDTO {
  return {
    id: resource.id,
    item_id: resource.itemId,
    name: resource.name,
    quantity: resource.quantity,
    is_active: resource.isActive,
    created_at: resource.createdAt,
  };
}

// ============================================================
// Resources
// ============================================================

export async function listResourcesService(page: number, perPage: number) {
  const { resources, total } = await findAllResources(page, perPage);

  return {
    data: resources.map(formatResource),
    meta: { page, per_page: perPage, total },
  };
}

export async function getResourceService(id: string) {
  const resource = await findResourceById(id);

  if (!resource || !resource.isActive) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
  }

  return formatResource(resource);
}

export async function createResourceService(data: CreateResourceDTO) {
  const item = await findItemForBooking(data.item_id);

  if (!item || !item.isActive) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Item not found.');
  }

  if (!item.isBookable) {
    throw new AppError(
      400,
      'ITEM_NOT_BOOKABLE',
      'Referenced item does not have is_bookable = true.'
    );
  }

  const resource = await createResource(data);
  return formatResource(resource);
}

export async function updateResourceService(id: string, data: UpdateResourceDTO) {
  const existing = await findResourceById(id);

  if (!existing) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
  }

  const updated = await updateResource(id, data);
  return formatResource(updated);
}

function formatReservation(
  reservation: NonNullable<Awaited<ReturnType<typeof prisma.reservation.create>>>
): ReservationDTO {
  return {
    id: reservation.id,
    resource_id: reservation.resourceId,
    requested_by: reservation.requestedBy,
    quantity: reservation.quantity,
    start_time: reservation.startTime,
    end_time: reservation.endTime,
    status: reservation.status,
    priority: reservation.priority,
    notes: reservation.notes ?? null,
    reviewed_by: reservation.reviewedBy ?? null,
    reviewed_at: reservation.reviewedAt ?? null,
    created_at: reservation.createdAt,
    updated_at: reservation.updatedAt,
  };
}

// ============================================================
// Availability
// ============================================================

export async function getAvailabilityService(
  resourceId: string,
  startTime: Date,
  endTime: Date
): Promise<AvailabilityDTO> {
  const resource = await findResourceById(resourceId);

  if (!resource || !resource.isActive) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
  }

  const reservedQuantity = await getOverlappingQuantity(resourceId, startTime, endTime);

  return {
    resource_id: resourceId,
    total_quantity: resource.quantity,
    reserved_quantity: reservedQuantity,
    available_quantity: resource.quantity - reservedQuantity,
    start_time: startTime,
    end_time: endTime,
  };
}

// ============================================================
// Reservations
// ============================================================

export async function createReservationService(
  data: CreateReservationDTO,
  accountId: string,
  permissions: string[]
): Promise<ReservationDTO> {
  const startTime = new Date(data.start_time);
  const endTime = new Date(data.end_time);

  if (endTime <= startTime) {
    throw new AppError(400, 'INVALID_TIME_RANGE', 'end_time must be after start_time.');
  }

  if (startTime < new Date()) {
    throw new AppError(400, 'INVALID_TIME_RANGE', 'start_time must be in the future.');
  }

  const priority = await findUserHighestPriority(accountId);

  const reservation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.resource_id}))::text`;

    const resource = await tx.resource.findUnique({
      where: { id: data.resource_id },
    });

    if (!resource || !resource.isActive) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const conflicting = await tx.reservation.findMany({
      where: {
        resourceId: data.resource_id,
        status: { in: ['pending', 'approved'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, quantity: true, priority: true },
    });

    const reservedQuantity = conflicting.reduce((sum, r) => sum + r.quantity, 0);
    const availableQuantity = resource.quantity - reservedQuantity;

    if (data.quantity > availableQuantity) {
      if (!data.override) {
        throw new AppError(
          409,
          'INSUFFICIENT_AVAILABILITY',
          'Requested quantity is unavailable in the given time window.'
        );
      }

      if (!permissions.includes('bookings:override')) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'You do not have permission to override conflicting reservations.'
        );
      }

      const lower = conflicting
      .filter((r) => r.priority < priority)
      .sort((a, b) => a.priority - b.priority);

      if (lower.length === 0) {
        throw new AppError(
          409,
          'INSUFFICIENT_AVAILABILITY',
          'Cannot override — no conflicting reservations have lower priority.'
        );
      }

      let freed = availableQuantity;
      const toCancel: string[] = [];

      for (const r of lower) {
        if (freed >= data.quantity) break;
        toCancel.push(r.id);
        freed += r.quantity;
      }

      if (freed < data.quantity) {
        throw new AppError(
          409,
          'INSUFFICIENT_AVAILABILITY',
          'Insufficient lower-priority reservations to override.'
        );
      }

      await tx.reservation.updateMany({
        where: { id: { in: toCancel } },
        data: {
          status: 'cancelled',
          notes: 'Overridden by higher-priority reservation.',
        },
      });
    }

    return tx.reservation.create({
      data: {
        resourceId: data.resource_id,
        requestedBy: accountId,
        quantity: data.quantity,
        startTime,
        endTime,
        status: 'pending',
        priority,
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  });

  createAuditEvent({
    actorId: accountId,
    action: 'bookings.reservation.created',
    module: 'bookings',
    targetType: 'reservation',
    targetId: reservation.id,
    payload: {
      resourceId: data.resource_id,
      quantity: data.quantity,
      startTime: data.start_time,
      endTime: data.end_time,
      override: data.override ?? false,
    },
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

  return formatReservation(reservation);
}

// ============================================================
// Reservation Reads
// ============================================================

export async function listReservationsService(
  accountId: string,
  permissions: string[],
  filters: {
    resourceId?: string;
    status?: string;
    requestedBy?: string;
    from?: string;
    to?: string;
    page: number;
    perPage: number;
  }
) {
  const canManageBookings = permissions.includes('bookings:write');

  const { reservations, total } = await findReservations({
    accountId,
    isAdminOrManager: canManageBookings,
    ...(filters.resourceId && { resourceId: filters.resourceId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.requestedBy && canManageBookings && { requestedBy: filters.requestedBy }),
    ...(filters.from && { from: new Date(filters.from) }),
    ...(filters.to && { to: new Date(filters.to) }),
    page: filters.page,
    perPage: filters.perPage,
  });

  return {
    data: reservations.map(formatReservation),
    meta: { page: filters.page, per_page: filters.perPage, total },
  };
}

export async function getReservationService(
  id: string,
  accountId: string,
  permissions: string[]
) {
  const reservation = await findReservationById(id);

  if (!reservation) {
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found.');
  }

  const canManageBookings = permissions.includes('bookings:write');

  if (!canManageBookings && reservation.requestedBy !== accountId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this reservation.');
  }

  return formatReservation(reservation);
}

// ============================================================
// Reservation Mutations
// ============================================================

export async function updateReservationService(
  id: string,
  data: UpdateReservationDTO,
  accountId: string,
  permissions: string[]
): Promise<ReservationDTO> {
  const reservation = await findReservationById(id);

  if (!reservation) {
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found.');
  }

  const canManageBookings = permissions.includes('bookings:write');

  if (!canManageBookings && reservation.requestedBy !== accountId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this reservation.');
  }

  if (reservation.status !== 'pending') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      'Only pending reservations can be modified.'
    );
  }

  if (!canManageBookings) {
    if (data.quantity !== undefined || data.start_time !== undefined || data.end_time !== undefined) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions to update these fields.');
    }

    if (data.status !== undefined && data.status !== 'cancelled') {
      throw new AppError(403, 'FORBIDDEN', 'You may only cancel your own reservations.');
    }
  }

  const startTime = data.start_time !== undefined ? new Date(data.start_time) : undefined;
  const endTime = data.end_time !== undefined ? new Date(data.end_time) : undefined;

  if (startTime !== undefined && endTime !== undefined && endTime <= startTime) {
    throw new AppError(400, 'INVALID_TIME_RANGE', 'end_time must be after start_time.');
  }

  const updated = await updateReservation(id, {
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.quantity !== undefined && { quantity: data.quantity }),
    ...(startTime !== undefined && { startTime }),
    ...(endTime !== undefined && { endTime }),
  });

  if (data.status === 'cancelled') {
    createAuditEvent({
      actorId: accountId,
      action: 'bookings.reservation.cancelled',
      module: 'bookings',
      targetType: 'reservation',
      targetId: reservation.id,
    }).catch((err) => console.error('[audit] Failed to write audit event:', err));
  }

  return formatReservation(updated);
}

// ============================================================
// Review Flow
// ============================================================

export async function reviewReservationService(
  id: string,
  data: ReviewReservationDTO,
  reviewerId: string,
  reviewerEmail: string
): Promise<ReservationDTO> {
  const reservation = await findReservationById(id);

  if (!reservation) {
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found.');
  }

  if (reservation.status !== 'pending') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      'Only pending reservations can be reviewed.'
    );
  }

  if (data.action === 'approve') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${reservation.resourceId}))::text`;

      const resource = await tx.resource.findUnique({
        where: { id: reservation.resourceId },
      });

      if (!resource || !resource.isActive) {
        throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource no longer exists.');
      }

      const result = await tx.reservation.aggregate({
        where: {
          resourceId: reservation.resourceId,
          status: { in: ['pending', 'approved'] },
          startTime: { lt: reservation.endTime },
          endTime: { gt: reservation.startTime },
          NOT: { id: reservation.id },
        },
        _sum: { quantity: true },
      });

      const reservedQuantity = result._sum.quantity ?? 0;

      if (reservation.quantity > resource.quantity - reservedQuantity) {
        throw new AppError(
          409,
          'INSUFFICIENT_AVAILABILITY',
          'Quantity is no longer available for the requested time window.'
        );
      }

      return tx.reservation.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      });
    });

    createAuditEvent({
      actorId: reviewerId,
      actorEmail: reviewerEmail,
      action: 'bookings.reservation.approved',
      module: 'bookings',
      targetType: 'reservation',
      targetId: reservation.id,
    }).catch((err) => console.error('[audit] Failed to write audit event:', err));

    return formatReservation(updated);
  }

  // reject
  const updated = await updateReservation(id, {
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    ...(data.notes !== undefined && { notes: data.notes }),
  });

  createAuditEvent({
    actorId: reviewerId,
    actorEmail: reviewerEmail,
    action: 'bookings.reservation.rejected',
    module: 'bookings',
    targetType: 'reservation',
    targetId: reservation.id,
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));


  return formatReservation(updated);
}