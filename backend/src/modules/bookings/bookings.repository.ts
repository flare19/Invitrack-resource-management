import prisma from '../../config/prisma';
import {
  CreateResourceDTO,
  UpdateResourceDTO,
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