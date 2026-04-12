import { AppError } from '../../errors/AppError';
import {
  findAllCategories,
  findCategoryById,
  createCategory,
  findAllLocations,
  findLocationById,
  createLocation,
  findItems,
  findItemById,
  findItemByIdRaw,
  findItemBySku,
  createItem,
  updateItem,
  softDeleteItem,
  findStockLevelsByItemId,
  createTransactionWithStockUpdate,
  findTransactions,
} from './inventory.repository';
import {
  CategoryDTO,
  CreateCategoryDTO,
  CreateItemDTO,
  CreateLocationDTO,
  CreateTransactionDTO,
  ItemDTO,
  ItemDetailDTO,
  ListItemsQueryDTO,
  ListTransactionsQueryDTO,
  LocationDTO,
  StockLevelDetailDTO,
  TransactionDTO,
  UpdateItemDTO,
} from './inventory.types';

import { createAuditEvent } from '../audit/audit.service';
// ============================================================
// Mappers
// ============================================================

function formatCategory(
  category: NonNullable<Awaited<ReturnType<typeof findCategoryById>>>
): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    parent_id: category.parentId ?? null,
    created_at: category.createdAt,
  };
}

function formatLocation(
  location: NonNullable<Awaited<ReturnType<typeof findLocationById>>>
): LocationDTO {
  return {
    id: location.id,
    name: location.name,
    description: location.description ?? null,
    parent_id: location.parentId ?? null,
  };
}

function formatItem(
  item: NonNullable<Awaited<ReturnType<typeof findItemByIdRaw>>>
): ItemDTO {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description ?? null,
    category_id: item.categoryId ?? null,
    unit: item.unit,
    reorder_threshold: item.reorderThreshold,
    is_bookable: item.isBookable,
    is_active: item.isActive,
    version: item.version,
    image_url: item.imageUrl ?? null,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function formatItemDetail(
  item: NonNullable<Awaited<ReturnType<typeof findItemById>>>
): ItemDetailDTO {
  return {
    ...formatItem(item),
    stock_levels: item.stockLevels.map((sl) => ({
      location_id: sl.locationId,
      location_name: sl.location.name,
      quantity: sl.quantity,
    })),
  };
}

function formatStockLevel(
  sl: Awaited<ReturnType<typeof findStockLevelsByItemId>>[number]
): StockLevelDetailDTO {
  return {
    id: sl.id,
    item_id: sl.itemId,
    location_id: sl.locationId,
    location_name: sl.location.name,
    quantity: sl.quantity,
    updated_at: sl.updatedAt,
  };
}

function formatTransaction(
  tx: Awaited<ReturnType<typeof createTransactionWithStockUpdate>>
): TransactionDTO {
  return {
    id: tx.id,
    item_id: tx.itemId,
    location_id: tx.locationId,
    type: tx.type as TransactionDTO['type'],
    quantity_delta: tx.quantityDelta,
    reference_id: tx.referenceId ?? null,
    reference_type: tx.referenceType ?? null,
    notes: tx.notes ?? null,
    performed_by: tx.performedBy,
    performed_at: tx.performedAt,
  };
}

// ============================================================
// Categories
// ============================================================

export async function listCategories(): Promise<CategoryDTO[]> {
  const categories = await findAllCategories();
  return categories.map(formatCategory);
}

export async function addCategory(data: CreateCategoryDTO): Promise<CategoryDTO> {
  if (data.parent_id) {
    const parent = await findCategoryById(data.parent_id);
    if (!parent) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Parent category not found');
    }
  }

  const category = await createCategory(data);
  return formatCategory(category);
}

// ============================================================
// Locations
// ============================================================

export async function listLocations(): Promise<LocationDTO[]> {
  const locations = await findAllLocations();
  return locations.map(formatLocation);
}

export async function addLocation(data: CreateLocationDTO): Promise<LocationDTO> {
  if (data.parent_id) {
    const parent = await findLocationById(data.parent_id);
    if (!parent) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Parent location not found');
    }
  }

  const location = await createLocation(data);
  return formatLocation(location);
}

// ============================================================
// Items
// ============================================================

export async function listItems(
  query: ListItemsQueryDTO
): Promise<{ data: ItemDTO[]; meta: { page: number; per_page: number; total: number } }> {
  const { items, total, page, perPage } = await findItems(query);

  return {
    data: (items as NonNullable<Awaited<ReturnType<typeof findItemByIdRaw>>>[]).map(formatItem),
    meta: { page, per_page: perPage, total },
  };
}

export async function getItemById(id: string): Promise<ItemDetailDTO> {
  const item = await findItemById(id);

  if (!item) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${id}' does not exist`);
  }

  return formatItemDetail(item);
}

export async function addItem(
  data: CreateItemDTO,
  createdBy: string
): Promise<ItemDTO> {
  if (data.category_id) {
    const category = await findCategoryById(data.category_id);
    if (!category) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Category not found');
    }
  }

  const existing = await findItemBySku(data.sku);
  if (existing) {
    throw new AppError(409, 'CONFLICT', `SKU '${data.sku}' is already in use`);
  }

  const item = await createItem(data, createdBy);

  createAuditEvent({
    actorId: createdBy,
    action: 'inventory.item.created',
    module: 'inventory',
    targetType: 'item',
    targetId: item.id,
    payload: { sku: item.sku, name: item.name },
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

  return formatItem(item);
}

export async function editItem(
  id: string,
  data: UpdateItemDTO,
  actorId: string,
  actorEmail: string
): Promise<ItemDTO> {
  const existing = await findItemByIdRaw(id);

  if (!existing) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${id}' does not exist`);
  }

  if (data.category_id) {
    const category = await findCategoryById(data.category_id);
    if (!category) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Category not found');
    }
  }

  try {
    const updated = await updateItem(id, data);

    createAuditEvent({
      actorId,
      actorEmail,
      action: 'inventory.item.updated',
      module: 'inventory',
      targetType: 'item',
      targetId: id,
      payload: { ...data },
    }).catch((err) => console.error('[audit] Failed to write audit event:', err));

    return formatItem(updated);
  } catch (err: unknown) {
    // Prisma throws P2025 (RecordNotFound) when the version filter doesn't match
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      throw new AppError(
        409,
        'VERSION_MISMATCH',
        'Item was modified by another request. Fetch the latest version and retry.'
      );
    }
    throw err;
  }
}

export async function removeItem(id: string): Promise<void> {
  const existing = await findItemByIdRaw(id);

  if (!existing) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${id}' does not exist`);
  }

  try {
    await softDeleteItem(id);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${id}' does not exist`);
    }
    throw err;
  }
}

// ============================================================
// Stock Levels
// ============================================================

export async function getStockLevels(itemId: string): Promise<StockLevelDetailDTO[]> {
  const item = await findItemByIdRaw(itemId);

  if (!item) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${itemId}' does not exist`);
  }

  const stockLevels = await findStockLevelsByItemId(itemId);
  return stockLevels.map(formatStockLevel);
}

// ============================================================
// Transactions
// ============================================================

export async function recordTransaction(
  data: CreateTransactionDTO,
  performedBy: string
): Promise<TransactionDTO> {
  // Validate type vs quantity_delta sign consistency
  if (data.type === 'in' && data.quantity_delta <= 0) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      "Transaction type 'in' requires a positive quantity_delta"
    );
  }

  if (data.type === 'out' && data.quantity_delta >= 0) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      "Transaction type 'out' requires a negative quantity_delta"
    );
  }

  // Validate item exists and is active
  const item = await findItemByIdRaw(data.item_id);
  if (!item) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Item with id '${data.item_id}' does not exist`);
  }

  // Validate location exists
  const location = await findLocationById(data.location_id);
  if (!location) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', `Location with id '${data.location_id}' does not exist`);
  }

  try {
    const transaction = await createTransactionWithStockUpdate(data, performedBy);

    createAuditEvent({
      actorId: performedBy,
      action: 'inventory.transaction.created',
      module: 'inventory',
      targetType: 'transaction',
      targetId: transaction.id,
      payload: {
        itemId: data.item_id,
        locationId: data.location_id,
        type: data.type,
        quantityDelta: data.quantity_delta,
      },
    }).catch((err) => console.error('[audit] Failed to write audit event:', err));

    return formatTransaction(transaction);
  } catch (err: unknown) {
    // Postgres CHECK constraint violation — stock would go negative
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      throw new AppError(400, 'INSUFFICIENT_STOCK', 'Transaction would result in negative stock');
    }
    throw err;
  }
}

export async function listTransactions(
  query: ListTransactionsQueryDTO
): Promise<{
  data: TransactionDTO[];
  meta: { page: number; per_page: number; total: number };
}> {
  const { transactions, total, page, perPage } = await findTransactions(query);

  return {
    data: transactions.map(formatTransaction),
    meta: { page, per_page: perPage, total },
  };
}