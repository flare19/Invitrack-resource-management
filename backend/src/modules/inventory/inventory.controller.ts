import { Request, Response, NextFunction } from 'express';
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
} from './inventory.service';

import {
    ListTransactionsQueryDTO,
    TransactionType
} from './inventory.types';

// ============================================================
// Categories
// ============================================================

export async function listCategoriesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await listCategories();
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
}

export async function createCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, parent_id } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name is required and must be a string.',
          details: {},
        },
      });
      return;
    }

    if (parent_id !== undefined && typeof parent_id !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'parent_id must be a string.',
          details: {},
        },
      });
      return;
    }

    const category = await addCategory({ name, parent_id });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Locations
// ============================================================

export async function listLocationsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const locations = await listLocations();
    res.status(200).json(locations);
  } catch (err) {
    next(err);
  }
}

export async function createLocationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, description, parent_id } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name is required and must be a string.',
          details: {},
        },
      });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'description must be a string.',
          details: {},
        },
      });
      return;
    }

    if (parent_id !== undefined && typeof parent_id !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'parent_id must be a string.',
          details: {},
        },
      });
      return;
    }

    const location = await addLocation({ name, description, parent_id });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Items
// ============================================================

export async function listItemsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      page,
      per_page,
      category_id,
      is_bookable,
      low_stock,
      search,
    } = req.query;

    const result = await listItems({
        ...(page && { page: Number(page) }),
        ...(per_page && { per_page: Number(per_page) }),
        ...(category_id && { category_id: category_id as string }),
        ...(is_bookable !== undefined && { is_bookable: is_bookable === 'true' }),
        ...(low_stock !== undefined && { low_stock: low_stock === 'true' }),
        ...(search && { search: search as string }),
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const item = await getItemById(id);
    res.status(200).json(item);
  } catch (err) {
    next(err);
  }
}

export async function createItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      sku,
      name,
      description,
      category_id,
      unit,
      reorder_threshold,
      is_bookable,
    } = req.body;

    if (!sku || typeof sku !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'sku is required and must be a string.', details: {} },
      });
      return;
    }

    if (!name || typeof name !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'name is required and must be a string.', details: {} },
      });
      return;
    }

    if (!unit || typeof unit !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'unit is required and must be a string.', details: {} },
      });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'description must be a string.', details: {} },
      });
      return;
    }

    if (category_id !== undefined && typeof category_id !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'category_id must be a string.', details: {} },
      });
      return;
    }

    if (reorder_threshold !== undefined && typeof reorder_threshold !== 'number') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'reorder_threshold must be a number.', details: {} },
      });
      return;
    }

    if (is_bookable !== undefined && typeof is_bookable !== 'boolean') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'is_bookable must be a boolean.', details: {} },
      });
      return;
    }

    const item = await addItem(
      { sku, name, description, category_id, unit, reorder_threshold, is_bookable },
      req.user!.id,
      req.user!.email
    );

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function updateItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const {
      version,
      name,
      description,
      category_id,
      unit,
      reorder_threshold,
      is_bookable,
    } = req.body;

    if (version === undefined || typeof version !== 'number') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'version is required and must be a number.', details: {} },
      });
      return;
    }

    if (name !== undefined && typeof name !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'name must be a string.', details: {} },
      });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'description must be a string.', details: {} },
      });
      return;
    }

    if (category_id !== undefined && typeof category_id !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'category_id must be a string.', details: {} },
      });
      return;
    }

    if (unit !== undefined && typeof unit !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'unit must be a string.', details: {} },
      });
      return;
    }

    if (reorder_threshold !== undefined && typeof reorder_threshold !== 'number') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'reorder_threshold must be a number.', details: {} },
      });
      return;
    }

    if (is_bookable !== undefined && typeof is_bookable !== 'boolean') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'is_bookable must be a boolean.', details: {} },
      });
      return;
    }

    const item = await editItem(id, {
      version,
      name,
      description,
      category_id,
      unit,
      reorder_threshold,
      is_bookable,
    }, req.user!.id, req.user!.email);

    res.status(200).json(item);
  } catch (err) {
    next(err);
  }
}

export async function deleteItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    await removeItem(id, req.user!.id, req.user!.email);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Stock Levels
// ============================================================

export async function getStockLevelsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const stockLevels = await getStockLevels(id);
    res.status(200).json(stockLevels);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Transactions
// ============================================================

export async function createTransactionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      item_id,
      location_id,
      type,
      quantity_delta,
      reference_id,
      reference_type,
      notes,
    } = req.body;

    if (!item_id || typeof item_id !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'item_id is required and must be a string.', details: {} },
      });
      return;
    }

    if (!location_id || typeof location_id !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'location_id is required and must be a string.', details: {} },
      });
      return;
    }

    const validTypes = ['in', 'out', 'adjustment', 'transfer'];
    if (!type || !validTypes.includes(type)) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: "type is required and must be one of: 'in', 'out', 'adjustment', 'transfer'.", details: {} },
      });
      return;
    }

    if (quantity_delta === undefined || typeof quantity_delta !== 'number') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'quantity_delta is required and must be a number.', details: {} },
      });
      return;
    }

    if (reference_id !== undefined && typeof reference_id !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'reference_id must be a string.', details: {} },
      });
      return;
    }

    if (reference_type !== undefined && typeof reference_type !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'reference_type must be a string.', details: {} },
      });
      return;
    }

    if (notes !== undefined && typeof notes !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'notes must be a string.', details: {} },
      });
      return;
    }

    const transaction = await recordTransaction(
      { item_id, location_id, type, quantity_delta, reference_id, reference_type, notes },
      req.user!.id
    );

    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function listTransactionsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      item_id,
      location_id,
      type,
      performed_by,
      from,
      to,
      page,
      per_page,
    } = req.query;

    const validTypes = ['in', 'out', 'adjustment', 'transfer'];

const result = await listTransactions({
  ...(item_id && { item_id: item_id as string }),
  ...(location_id && { location_id: location_id as string }),
  ...(type && validTypes.includes(type as string) && { type: type as TransactionType }),
  ...(performed_by && { performed_by: performed_by as string }),
  ...(from && { from: from as string }),
  ...(to && { to: to as string }),
  ...(page && { page: Number(page) }),
  ...(per_page && { per_page: Number(per_page) }),
});

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}