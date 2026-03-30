import { AppError } from '../../../errors/AppError';
import {
  listCategories,
  addCategory,
  listLocations,
  addLocation,
  listItems,
  getItemById,
  addItem,
  editItem,
  removeItem,
  getStockLevels,
  recordTransaction,
  listTransactions,
} from '../inventory.service';

// ─── Mock the entire repository module ───────────────────────────────────────
jest.mock('../inventory.repository');

// ─── Import mocked repository functions ──────────────────────────────────────
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
  findStockLevelByItemAndLocation,
  upsertStockLevel,
  createTransactionWithStockUpdate,
  findTransactions,
} from '../inventory.repository';

// ─── Cast mocks ───────────────────────────────────────────────────────────────
const mockFindAllCategories = findAllCategories as jest.MockedFunction<typeof findAllCategories>;
const mockFindCategoryById = findCategoryById as jest.MockedFunction<typeof findCategoryById>;
const mockCreateCategory = createCategory as jest.MockedFunction<typeof createCategory>;
const mockFindAllLocations = findAllLocations as jest.MockedFunction<typeof findAllLocations>;
const mockFindLocationById = findLocationById as jest.MockedFunction<typeof findLocationById>;
const mockCreateLocation = createLocation as jest.MockedFunction<typeof createLocation>;
const mockFindItems = findItems as jest.MockedFunction<typeof findItems>;
const mockFindItemById = findItemById as jest.MockedFunction<typeof findItemById>;
const mockFindItemByIdRaw = findItemByIdRaw as jest.MockedFunction<typeof findItemByIdRaw>;
const mockFindItemBySku = findItemBySku as jest.MockedFunction<typeof findItemBySku>;
const mockCreateItem = createItem as jest.MockedFunction<typeof createItem>;
const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockSoftDeleteItem = softDeleteItem as jest.MockedFunction<typeof softDeleteItem>;
const mockFindStockLevelsByItemId = findStockLevelsByItemId as jest.MockedFunction<typeof findStockLevelsByItemId>;
const mockFindStockLevelByItemAndLocation = findStockLevelByItemAndLocation as jest.MockedFunction<typeof findStockLevelByItemAndLocation>;
const mockUpsertStockLevel = upsertStockLevel as jest.MockedFunction<typeof upsertStockLevel>;
const mockCreateTransactionWithStockUpdate = createTransactionWithStockUpdate as jest.MockedFunction<typeof createTransactionWithStockUpdate>;
const mockFindTransactions = findTransactions as jest.MockedFunction<typeof findTransactions>;

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const mockCategory = {
  id: 'cat-uuid',
  name: 'Electronics',
  parentId: null,
  createdAt: new Date('2024-03-06T10:00:00Z'),
};

const mockLocation = {
  id: 'loc-uuid',
  name: 'Warehouse A',
  description: 'Main store',
  parentId: null,
};

const mockItem = {
  id: 'item-uuid',
  sku: 'ITEM-001',
  name: 'Projector',
  description: '4K projector',
  categoryId: 'cat-uuid',
  unit: 'pcs',
  reorderThreshold: 2,
  isBookable: false,
  isActive: true,
  version: 0,
  imageUrl: null,
  createdBy: 'user-uuid',
  createdAt: new Date('2024-03-06T10:00:00Z'),
  updatedAt: new Date('2024-03-06T10:00:00Z'),
};

const mockItemWithStock = {
  ...mockItem,
  stockLevels: [
    {
      id: 'sl-uuid',
      itemId: 'item-uuid',
      locationId: 'loc-uuid',
      quantity: 5,
      updatedAt: new Date('2024-03-06T10:00:00Z'),
      location: { name: 'Warehouse A' },
    },
  ],
};

const mockStockLevel = {
  id: 'sl-uuid',
  itemId: 'item-uuid',
  locationId: 'loc-uuid',
  quantity: 5,
  updatedAt: new Date('2024-03-06T10:00:00Z'),
  location: { name: 'Warehouse A' },
};

const mockTransaction = {
  id: 'tx-uuid',
  itemId: 'item-uuid',
  locationId: 'loc-uuid',
  type: 'in',
  quantityDelta: 10,
  referenceId: null,
  referenceType: null,
  notes: null,
  performedBy: 'user-uuid',
  performedAt: new Date('2024-03-06T10:00:00Z'),
};

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();
});

// ============================================================
// Categories
// ============================================================

describe('listCategories', () => {
  it('should return all categories formatted', async () => {
    mockFindAllCategories.mockResolvedValue([mockCategory]);

    const result = await listCategories();

    expect(result).toEqual([
      {
        id: 'cat-uuid',
        name: 'Electronics',
        parent_id: null,
        created_at: mockCategory.createdAt,
      },
    ]);
  });

  it('should return empty array when no categories exist', async () => {
    mockFindAllCategories.mockResolvedValue([]);
    const result = await listCategories();
    expect(result).toEqual([]);
  });
});

describe('addCategory', () => {
  it('should create a category without parent', async () => {
    mockCreateCategory.mockResolvedValue(mockCategory);

    const result = await addCategory({ name: 'Electronics' });

    expect(mockFindCategoryById).not.toHaveBeenCalled();
    expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'Electronics' });
    expect(result.name).toBe('Electronics');
  });

  it('should create a category with valid parent', async () => {
    mockFindCategoryById.mockResolvedValue(mockCategory);
    mockCreateCategory.mockResolvedValue({ ...mockCategory, parentId: 'cat-uuid' });

    const result = await addCategory({ name: 'AV Equipment', parent_id: 'cat-uuid' });

    expect(mockFindCategoryById).toHaveBeenCalledWith('cat-uuid');
    expect(result.parent_id).toBe('cat-uuid');
  });

  it('should throw 404 if parent category does not exist', async () => {
    mockFindCategoryById.mockResolvedValue(null);

    await expect(addCategory({ name: 'AV Equipment', parent_id: 'bad-uuid' }))
      .rejects.toThrow(AppError);

    const err = await addCategory({ name: 'AV Equipment', parent_id: 'bad-uuid' }).catch(e => e);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Locations
// ============================================================

describe('listLocations', () => {
  it('should return all locations formatted', async () => {
    mockFindAllLocations.mockResolvedValue([mockLocation]);

    const result = await listLocations();

    expect(result).toEqual([
      {
        id: 'loc-uuid',
        name: 'Warehouse A',
        description: 'Main store',
        parent_id: null,
      },
    ]);
  });

  it('should return empty array when no locations exist', async () => {
    mockFindAllLocations.mockResolvedValue([]);
    const result = await listLocations();
    expect(result).toEqual([]);
  });
});

describe('addLocation', () => {
  it('should create a location without parent', async () => {
    mockCreateLocation.mockResolvedValue(mockLocation);

    const result = await addLocation({ name: 'Warehouse A' });

    expect(mockFindLocationById).not.toHaveBeenCalled();
    expect(result.name).toBe('Warehouse A');
  });

  it('should create a location with valid parent', async () => {
    mockFindLocationById.mockResolvedValue(mockLocation);
    mockCreateLocation.mockResolvedValue({ ...mockLocation, parentId: 'loc-uuid' });

    const result = await addLocation({ name: 'Shelf 3', parent_id: 'loc-uuid' });

    expect(mockFindLocationById).toHaveBeenCalledWith('loc-uuid');
    expect(result.parent_id).toBe('loc-uuid');
  });

  it('should throw 404 if parent location does not exist', async () => {
    mockFindLocationById.mockResolvedValue(null);

    const err = await addLocation({ name: 'Shelf 3', parent_id: 'bad-uuid' }).catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Items
// ============================================================

describe('listItems', () => {
  it('should return paginated items', async () => {
    mockFindItems.mockResolvedValue({
      items: [mockItem],
      total: 1,
      page: 1,
      perPage: 20,
    });

    const result = await listItems({});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
    expect(result.data[0]!.sku).toBe('ITEM-001');
  });

  it('should return empty data when no items exist', async () => {
    mockFindItems.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

    const result = await listItems({});

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

describe('getItemById', () => {
  it('should return item with stock levels', async () => {
    mockFindItemById.mockResolvedValue(mockItemWithStock);

    const result = await getItemById('item-uuid');

    expect(result.id).toBe('item-uuid');
    expect(result.stock_levels).toHaveLength(1);
    expect(result.stock_levels[0]!.location_name).toBe('Warehouse A');
  });

  it('should throw 404 if item not found', async () => {
    mockFindItemById.mockResolvedValue(null);

    const err = await getItemById('bad-uuid').catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

describe('addItem', () => {
  it('should create an item successfully', async () => {
    mockFindCategoryById.mockResolvedValue(mockCategory);
    mockFindItemBySku.mockResolvedValue(null);
    mockCreateItem.mockResolvedValue(mockItem);

    const result = await addItem(
      { sku: 'ITEM-001', name: 'Projector', unit: 'pcs' },
      'user-uuid'
    );

    expect(mockFindItemBySku).toHaveBeenCalledWith('ITEM-001');
    expect(mockCreateItem).toHaveBeenCalled();
    expect(result.sku).toBe('ITEM-001');
  });

  it('should throw 409 if SKU already exists', async () => {
    mockFindItemBySku.mockResolvedValue(mockItem);

    const err = await addItem(
      { sku: 'ITEM-001', name: 'Projector', unit: 'pcs' },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('should throw 404 if category does not exist', async () => {
    mockFindCategoryById.mockResolvedValue(null);
    mockFindItemBySku.mockResolvedValue(null);

    const err = await addItem(
      { sku: 'ITEM-001', name: 'Projector', unit: 'pcs', category_id: 'bad-uuid' },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

describe('editItem', () => {
  it('should update item successfully', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockUpdateItem.mockResolvedValue({ ...mockItem, name: 'Updated Projector', version: 1 });

    const result = await editItem('item-uuid', { version: 0, name: 'Updated Projector' });

    expect(mockFindItemByIdRaw).toHaveBeenCalledWith('item-uuid');
    expect(mockUpdateItem).toHaveBeenCalled();
    expect(result.name).toBe('Updated Projector');
    expect(result.version).toBe(1);
  });

  it('should throw 404 if item does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(null);

    const err = await editItem('bad-uuid', { version: 0 }).catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 409 on version mismatch (P2025)', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
    mockUpdateItem.mockRejectedValue(prismaError);

    const err = await editItem('item-uuid', { version: 99 }).catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('should throw 404 if category does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindCategoryById.mockResolvedValue(null);

    const err = await editItem('item-uuid', { version: 0, category_id: 'bad-uuid' }).catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

describe('removeItem', () => {
  it('should soft delete item successfully', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockSoftDeleteItem.mockResolvedValue({ ...mockItem, isActive: false });

    await expect(removeItem('item-uuid')).resolves.toBeUndefined();
    expect(mockSoftDeleteItem).toHaveBeenCalledWith('item-uuid');
  });

  it('should throw 404 if item does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(null);

    const err = await removeItem('bad-uuid').catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 404 if item already inactive (P2025)', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
    mockSoftDeleteItem.mockRejectedValue(prismaError);

    const err = await removeItem('item-uuid').catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Stock Levels
// ============================================================

describe('getStockLevels', () => {
  it('should return stock levels for a valid item', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindStockLevelsByItemId.mockResolvedValue([mockStockLevel]);

    const result = await getStockLevels('item-uuid');

    expect(result).toHaveLength(1);
    expect(result[0]!.location_name).toBe('Warehouse A');
    expect(result[0]!.quantity).toBe(5);
  });

  it('should return empty array if no stock levels exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindStockLevelsByItemId.mockResolvedValue([]);

    const result = await getStockLevels('item-uuid');
    expect(result).toHaveLength(0);
  });

  it('should throw 404 if item does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(null);

    const err = await getStockLevels('bad-uuid').catch(e => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Transactions
// ============================================================

describe('recordTransaction', () => {
  it('should record an inbound transaction successfully', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindLocationById.mockResolvedValue(mockLocation);
    mockCreateTransactionWithStockUpdate.mockResolvedValue(mockTransaction);

    const result = await recordTransaction(
      {
        item_id: 'item-uuid',
        location_id: 'loc-uuid',
        type: 'in',
        quantity_delta: 10,
      },
      'user-uuid'
    );

    expect(result.type).toBe('in');
    expect(result.quantity_delta).toBe(10);
  });

  it('should throw 422 if type is in but quantity_delta is negative', async () => {
    const err = await recordTransaction(
      { item_id: 'item-uuid', location_id: 'loc-uuid', type: 'in', quantity_delta: -5 },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('should throw 422 if type is out but quantity_delta is positive', async () => {
    const err = await recordTransaction(
      { item_id: 'item-uuid', location_id: 'loc-uuid', type: 'out', quantity_delta: 5 },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('should throw 404 if item does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(null);

    const err = await recordTransaction(
      { item_id: 'bad-uuid', location_id: 'loc-uuid', type: 'in', quantity_delta: 5 },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 404 if location does not exist', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindLocationById.mockResolvedValue(null);

    const err = await recordTransaction(
      { item_id: 'item-uuid', location_id: 'bad-uuid', type: 'in', quantity_delta: 5 },
      'user-uuid'
    ).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should allow adjustment type with any non-zero delta', async () => {
    mockFindItemByIdRaw.mockResolvedValue(mockItem);
    mockFindLocationById.mockResolvedValue(mockLocation);
    mockCreateTransactionWithStockUpdate.mockResolvedValue({
      ...mockTransaction,
      type: 'adjustment',
      quantityDelta: -3,
    });

    const result = await recordTransaction(
      { item_id: 'item-uuid', location_id: 'loc-uuid', type: 'adjustment', quantity_delta: -3 },
      'user-uuid'
    );

    expect(result.type).toBe('adjustment');
    expect(result.quantity_delta).toBe(-3);
  });
});

describe('listTransactions', () => {
  it('should return paginated transactions', async () => {
    mockFindTransactions.mockResolvedValue({
      transactions: [mockTransaction],
      total: 1,
      page: 1,
      perPage: 20,
    });

    const result = await listTransactions({});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
  });

  it('should return empty data when no transactions exist', async () => {
    mockFindTransactions.mockResolvedValue({ transactions: [], total: 0, page: 1, perPage: 20 });

    const result = await listTransactions({});
    expect(result.data).toHaveLength(0);
  });
});