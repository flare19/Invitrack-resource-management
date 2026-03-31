import { AppError } from '../../errors/AppError';
import {
  findAllResources,
  findResourceById,
  findResourceWithItem,
  createResource,
  updateResource,
  findItemForBooking,
} from './bookings.repository';
import {
  ResourceDTO,
  CreateResourceDTO,
  UpdateResourceDTO,
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