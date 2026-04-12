import prisma from '../../config/prisma';
import {
  CreateCategoryDTO,
  CreateItemDTO,
  CreateLocationDTO,
  CreateTransactionDTO,
  ListItemsQueryDTO,
  ListTransactionsQueryDTO,
  UpdateItemDTO,
} from './inventory.types';

// ============================================================
// Categories
// ============================================================

export async function findAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export async function createCategory(data: CreateCategoryDTO) {
  return prisma.category.create({
    data: {
      name: data.name,
      parentId: data.parent_id ?? null,
    },
  });
}

// ============================================================
// Locations
// ============================================================

export async function findAllLocations() {
  return prisma.location.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function findLocationById(id: string) {
  return prisma.location.findUnique({
    where: { id },
  });
}

export async function createLocation(data: CreateLocationDTO) {
  return prisma.location.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      parentId: data.parent_id ?? null,
    },
  });
}

// ============================================================
// Items
// ============================================================

export async function findItems(query: ListItemsQueryDTO) {
  const page = query.page ?? 1;
  const perPage = Math.min(query.per_page ?? 20, 100);
  const skip = (page - 1) * perPage;

  // low_stock requires a cross-column comparison (quantity <= reorder_threshold)
  // which Prisma's query builder does not support — use $queryRaw with
  // parameterised values to avoid SQL injection
  if (query.low_stock) {
    const categoryFilter = query.category_id ?? null;
    const isBookableFilter = query.is_bookable ?? null;
    const searchFilter = query.search ? `%${query.search}%` : null;

    const items = await prisma.$queryRaw<unknown[]>`
      SELECT i.*
      FROM inventory.items i
      WHERE i.is_active = true
        AND EXISTS (
          SELECT 1 FROM inventory.stock_levels sl
          WHERE sl.item_id = i.id
            AND sl.quantity <= i.reorder_threshold
        )
        AND (${categoryFilter}::uuid IS NULL OR i.category_id = ${categoryFilter}::uuid)
        AND (${isBookableFilter}::boolean IS NULL OR i.is_bookable = ${isBookableFilter}::boolean)
        AND (${searchFilter} IS NULL OR i.name ILIKE ${searchFilter} OR i.sku ILIKE ${searchFilter})
      ORDER BY i.created_at DESC
      LIMIT ${perPage} OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM inventory.items i
      WHERE i.is_active = true
        AND EXISTS (
          SELECT 1 FROM inventory.stock_levels sl
          WHERE sl.item_id = i.id
            AND sl.quantity <= i.reorder_threshold
        )
        AND (${categoryFilter}::uuid IS NULL OR i.category_id = ${categoryFilter}::uuid)
        AND (${isBookableFilter}::boolean IS NULL OR i.is_bookable = ${isBookableFilter}::boolean)
        AND (${searchFilter} IS NULL OR i.name ILIKE ${searchFilter} OR i.sku ILIKE ${searchFilter})
    `;

    const total = countResult[0] ? Number(countResult[0].count) : 0;
    return { items, total, page, perPage };
  }

  // Standard path — all other filters use Prisma's query builder
  const where: Record<string, unknown> = { isActive: true };

  if (query.category_id) where.categoryId = query.category_id;
  if (query.is_bookable !== undefined) where.isBookable = query.is_bookable;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.item.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.item.count({ where }),
  ]);

  return { items, total, page, perPage };
}

export async function findItemById(id: string) {
  return prisma.item.findUnique({
    where: { id, isActive: true },
    include: {
      stockLevels: {
        include: {
          location: {
            select: { name: true },
          },
        },
      },
    },
  });
}

export async function findItemByIdRaw(id: string) {
  return prisma.item.findUnique({
    where: { id, isActive: true },
  });
}

export async function findItemBySku(sku: string) {
  return prisma.item.findFirst({
    where: {
      sku,
      isActive: true,
    },
  });
}

export async function createItem(data: CreateItemDTO, createdBy: string) {
  return prisma.item.create({
    data: {
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.category_id ?? null,
      unit: data.unit,
      reorderThreshold: data.reorder_threshold ?? 0,
      isBookable: data.is_bookable ?? false,
      createdBy,
    },
  });
}

export async function updateItem(id: string, data: UpdateItemDTO) {
  return prisma.item.update({
    where: { id, version: data.version, isActive: true },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category_id !== undefined && { categoryId: data.category_id }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.reorder_threshold !== undefined && { reorderThreshold: data.reorder_threshold }),
      ...(data.is_bookable !== undefined && { isBookable: data.is_bookable }),
      version: { increment: 1 },
    },
  });
}

export async function softDeleteItem(id: string) {
  return prisma.item.update({
    where: { id, isActive: true },
    data: { isActive: false },
  });
}

// ============================================================
// Stock Levels
// ============================================================

export async function findStockLevelsByItemId(itemId: string) {
  return prisma.stockLevel.findMany({
    where: { itemId },
    include: {
      location: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function findStockLevelByItemAndLocation(
  itemId: string,
  locationId: string
) {
  return prisma.stockLevel.findUnique({
    where: { itemId_locationId: { itemId, locationId } },
  });
}

export async function upsertStockLevel(
  itemId: string,
  locationId: string,
  quantityDelta: number
) {
  return prisma.stockLevel.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: {
      itemId,
      locationId,
      quantity: quantityDelta,
    },
    update: {
      quantity: { increment: quantityDelta },
    },
  });
}

// ============================================================
// Transactions
// ============================================================

export async function createTransactionWithStockUpdate(
  data: CreateTransactionDTO,
  performedBy: string
) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        itemId: data.item_id,
        locationId: data.location_id,
        type: data.type,
        quantityDelta: data.quantity_delta,
        referenceId: data.reference_id ?? null,
        referenceType: data.reference_type ?? null,
        notes: data.notes ?? null,
        performedBy,
      },
    });

    await tx.stockLevel.upsert({
      where: {
        itemId_locationId: {
          itemId: data.item_id,
          locationId: data.location_id,
        },
      },
      create: {
        itemId: data.item_id,
        locationId: data.location_id,
        quantity: data.quantity_delta,
      },
      update: {
        quantity: { increment: data.quantity_delta },
      },
    });

    return transaction;
  });
}

export async function findTransactions(query: ListTransactionsQueryDTO) {
  const page = query.page ?? 1;
  const perPage = Math.min(query.per_page ?? 20, 100);
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (query.item_id) where.itemId = query.item_id;
  if (query.location_id) where.locationId = query.location_id;
  if (query.type) where.type = query.type;
  if (query.performed_by) where.performedBy = query.performed_by;

  if (query.from || query.to) {
    where.performedAt = {
      ...(query.from && { gte: new Date(query.from) }),
      ...(query.to && { lte: new Date(query.to) }),
    };
  }

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { performedAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, page, perPage };
}