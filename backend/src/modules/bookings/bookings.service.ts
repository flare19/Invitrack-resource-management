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
} from './bookings.repository';
import {
  ResourceDTO,
  CreateResourceDTO,
  UpdateResourceDTO,
  CreateReservationDTO,
  AvailabilityDTO,
  ReservationDTO,
} from './bookings.types';

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
  accountId: string
): Promise<ReservationDTO> {
  const startTime = new Date(data.start_time);
  const endTime = new Date(data.end_time);

  if (endTime <= startTime) {
    throw new AppError(400, 'INVALID_TIME_RANGE', 'end_time must be after start_time.');
  }

  const priority = await findUserHighestPriority(accountId);

  const reservation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.resource_id}))`;

    const resource = await tx.resource.findUnique({
      where: { id: data.resource_id },
    });

    if (!resource || !resource.isActive) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const result = await tx.reservation.aggregate({
      where: {
        resourceId: data.resource_id,
        status: { in: ['pending', 'approved'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      _sum: { quantity: true },
    });

    const reservedQuantity = result._sum.quantity ?? 0;

    if (data.quantity > resource.quantity - reservedQuantity) {
      throw new AppError(
        409,
        'INSUFFICIENT_AVAILABILITY',
        'Requested quantity is unavailable in the given time window.'
      );
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

  return formatReservation(reservation);
}