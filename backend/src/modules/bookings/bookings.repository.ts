import prisma from '../../config/prisma';
import {
  CreateResourceDTO,
  UpdateResourceDTO,
  CreateReservationDTO,
} from './bookings.types';

// ============================================================
// Resources
// ============================================================

export async function findAllResources(page: number, perPage: number) {
  const [resources, total] = await prisma.$transaction([
    prisma.resource.findMany({
      where: { isActive: true },
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.resource.count({
      where: { isActive: true },
    }),
  ]);

  return { resources, total };
}

export async function findResourceById(id: string) {
  return prisma.resource.findUnique({
    where: { id },
  });
}

export async function findResourceWithItem(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: { item: true },
  });
}

export async function createResource(data: CreateResourceDTO) {
  return prisma.resource.create({
    data: {
      itemId: data.item_id,
      name: data.name,
      quantity: data.quantity,
    },
  });
}

export async function updateResource(id: string, data: UpdateResourceDTO) {
  return prisma.resource.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
    },
  });
}

export async function findItemForBooking(itemId: string) {
  return prisma.item.findUnique({
    where: { id: itemId },
  });
}

// ============================================================
// Availability
// ============================================================

export async function getOverlappingQuantity(
  resourceId: string,
  startTime: Date,
  endTime: Date
): Promise<number> {
  const result = await prisma.reservation.aggregate({
    where: {
      resourceId,
      status: { in: ['pending', 'approved'] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

// ============================================================
// Reservations
// ============================================================

export async function findUserHighestPriority(accountId: string): Promise<number> {
  const result = await prisma.accountRole.findMany({
    where: { accountId },
    include: { role: true },
  });

  if (result.length === 0) return 0;

  return Math.max(...result.map((ar) => ar.role.priority));
}

export async function createReservation(
  data: CreateReservationDTO & { requested_by: string; priority: number }
) {
  return prisma.reservation.create({
    data: {
      resourceId: data.resource_id,
      requestedBy: data.requested_by,
      quantity: data.quantity,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      status: 'pending',
      priority: data.priority,
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}