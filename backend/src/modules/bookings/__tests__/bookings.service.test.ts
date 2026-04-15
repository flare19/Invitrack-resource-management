import { AppError } from '../../../errors/AppError';
import {
  listResourcesService,
  getResourceService,
  createResourceService,
  updateResourceService,
  getAvailabilityService,
  createReservationService,
  listReservationsService,
  getReservationService,
  updateReservationService,
  reviewReservationService,
} from '../bookings.service';

// ─── Mock repository ──────────────────────────────────────────────────────────
jest.mock('../bookings.repository');
jest.mock('../../../config/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));
// ─── Mock the audit module ────────────────────────────────────────────────────
jest.mock('../../../modules/audit/audit.service');

import {
  findAllResources,
  findResourceById,
  createResource,
  updateResource,
  findItemForBooking,
  getOverlappingQuantity,
  findUserHighestPriority,
  findReservations,
  findReservationById,
  updateReservation,
} from '../bookings.repository';
import prisma from '../../../config/prisma';
import { createAuditEvent } from '../../../modules/audit/audit.service';

// ─── Cast mocks ───────────────────────────────────────────────────────────────
const mockFindAllResources = findAllResources as jest.MockedFunction<typeof findAllResources>;
const mockFindResourceById = findResourceById as jest.MockedFunction<typeof findResourceById>;
const mockCreateResource = createResource as jest.MockedFunction<typeof createResource>;
const mockUpdateResource = updateResource as jest.MockedFunction<typeof updateResource>;
const mockFindItemForBooking = findItemForBooking as jest.MockedFunction<typeof findItemForBooking>;
const mockGetOverlappingQuantity = getOverlappingQuantity as jest.MockedFunction<typeof getOverlappingQuantity>;
const mockFindUserHighestPriority = findUserHighestPriority as jest.MockedFunction<typeof findUserHighestPriority>;
const mockFindReservations = findReservations as jest.MockedFunction<typeof findReservations>;
const mockFindReservationById = findReservationById as jest.MockedFunction<typeof findReservationById>;
const mockUpdateReservation = updateReservation as jest.MockedFunction<typeof updateReservation>;
const mockPrismaTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;
const mockCreateAuditEvent = createAuditEvent as jest.MockedFunction<typeof createAuditEvent>;

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const mockResource = {
  id: 'res-uuid',
  itemId: 'item-uuid',
  name: 'Conference Projector A',
  quantity: 2,
  isActive: true,
  createdAt: new Date('2024-03-06T10:00:00Z'),
};

const mockItem = {
  id: 'item-uuid',
  sku: 'ITEM-001',
  name: 'Projector',
  description: '4K projector',
  categoryId: null,
  unit: 'pcs',
  reorderThreshold: 2,
  isBookable: true,
  isActive: true,
  version: 0,
  imageUrl: null,
  createdBy: 'user-uuid',
  createdAt: new Date('2024-03-06T10:00:00Z'),
  updatedAt: new Date('2024-03-06T10:00:00Z'),
};

const mockReservation = {
  id: 'rsv-uuid',
  resourceId: 'res-uuid',
  requestedBy: 'user-uuid',
  quantity: 1,
  startTime: new Date(Date.now() + 86400000), // 1 day in future
  endTime: new Date(Date.now() + 90000000), // 1.04 days in future
  status: 'pending',
  priority: 10,
  notes: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();
  mockCreateAuditEvent.mockResolvedValue(undefined as any);
});

// ============================================================
// Resources
// ============================================================

describe('listResourcesService', () => {
  it('should return paginated resources', async () => {
    mockFindAllResources.mockResolvedValue({ resources: [mockResource], total: 1 });

    const result = await listResourcesService(1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('res-uuid');
    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
  });

  it('should return empty data when no resources exist', async () => {
    mockFindAllResources.mockResolvedValue({ resources: [], total: 0 });

    const result = await listResourcesService(1, 20);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

describe('getResourceService', () => {
  it('should return a resource by id', async () => {
    mockFindResourceById.mockResolvedValue(mockResource);

    const result = await getResourceService('res-uuid');

    expect(result.id).toBe('res-uuid');
    expect(result.name).toBe('Conference Projector A');
  });

  it('should throw 404 if resource not found', async () => {
    mockFindResourceById.mockResolvedValue(null);

    const err = await getResourceService('bad-uuid').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 404 if resource is inactive', async () => {
    mockFindResourceById.mockResolvedValue({ ...mockResource, isActive: false });

    const err = await getResourceService('res-uuid').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

describe('createResourceService', () => {
  it('should create a resource when item is bookable', async () => {
    mockFindItemForBooking.mockResolvedValue(mockItem);
    mockCreateResource.mockResolvedValue(mockResource);

    const result = await createResourceService({
      item_id: 'item-uuid',
      name: 'Conference Projector A',
      quantity: 2,
    });

    expect(result.id).toBe('res-uuid');
    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should throw 404 if item not found', async () => {
    mockFindItemForBooking.mockResolvedValue(null);

    const err = await createResourceService({
      item_id: 'bad-uuid',
      name: 'Projector',
      quantity: 1,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 400 if item is not bookable', async () => {
    mockFindItemForBooking.mockResolvedValue({ ...mockItem, isBookable: false });

    const err = await createResourceService({
      item_id: 'item-uuid',
      name: 'Projector',
      quantity: 1,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });
});

describe('updateResourceService', () => {
  it('should update a resource', async () => {
    mockFindResourceById.mockResolvedValue(mockResource);
    mockUpdateResource.mockResolvedValue({ ...mockResource, name: 'Updated Projector' });

    const result = await updateResourceService('res-uuid', { name: 'Updated Projector' });

    expect(result.name).toBe('Updated Projector');
  });

  it('should throw 404 if resource not found', async () => {
    mockFindResourceById.mockResolvedValue(null);

    const err = await updateResourceService('bad-uuid', { name: 'X' }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Availability
// ============================================================

describe('getAvailabilityService', () => {
  const startTime = new Date(Date.now() + 86400000); // 1 day in future
  const endTime = new Date(Date.now() + 90000000); // 1.04 days in future

  it('should return availability with correct quantities', async () => {
    mockFindResourceById.mockResolvedValue(mockResource);
    mockGetOverlappingQuantity.mockResolvedValue(1);

    const result = await getAvailabilityService('res-uuid', startTime, endTime);

    expect(result.total_quantity).toBe(2);
    expect(result.reserved_quantity).toBe(1);
    expect(result.available_quantity).toBe(1);
  });

  it('should return full availability when no overlapping reservations', async () => {
    mockFindResourceById.mockResolvedValue(mockResource);
    mockGetOverlappingQuantity.mockResolvedValue(0);

    const result = await getAvailabilityService('res-uuid', startTime, endTime);

    expect(result.available_quantity).toBe(2);
  });

  it('should throw 404 if resource not found', async () => {
    mockFindResourceById.mockResolvedValue(null);

    const err = await getAvailabilityService('bad-uuid', startTime, endTime).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Reservation Creation
// ============================================================

describe('createReservationService', () => {
  it('should throw 400 if end_time is before start_time', async () => {
    const futureStart = new Date(Date.now() + 86400000).toISOString();
    const futureEnd = new Date(Date.now() + 82800000).toISOString();

    const err = await createReservationService(
      {
        resource_id: 'res-uuid',
        quantity: 1,
        start_time: futureStart,
        end_time: futureEnd,
      },
      'user-uuid'
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });

  it('should create a reservation successfully', async () => {
    const futureStart = new Date(Date.now() + 86400000).toISOString();
    const futureEnd = new Date(Date.now() + 90000000).toISOString();

    mockFindUserHighestPriority.mockResolvedValue(10);
    mockPrismaTransaction.mockResolvedValue(mockReservation);

    const result = await createReservationService(
      {
        resource_id: 'res-uuid',
        quantity: 1,
        start_time: futureStart,
        end_time: futureEnd,
      },
      'user-uuid'
    );

    expect(result.id).toBe('rsv-uuid');
    expect(result.status).toBe('pending');
    expect(mockFindUserHighestPriority).toHaveBeenCalledWith('user-uuid');
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });

  it('should use priority 0 if user has no roles', async () => {
    const futureStart = new Date(Date.now() + 86400000).toISOString();
    const futureEnd = new Date(Date.now() + 90000000).toISOString();

    mockFindUserHighestPriority.mockResolvedValue(0);
    mockPrismaTransaction.mockResolvedValue(mockReservation);

    await createReservationService(
      {
        resource_id: 'res-uuid',
        quantity: 1,
        start_time: futureStart,
        end_time: futureEnd,
      },
      'user-uuid'
    );

    expect(mockFindUserHighestPriority).toHaveBeenCalledWith('user-uuid');
  });
});

// ============================================================
// Reservation Reads
// ============================================================

describe('listReservationsService', () => {
  it('should return only own reservations for employee', async () => {
    mockFindReservations.mockResolvedValue({ reservations: [mockReservation], total: 1 });

    const result = await listReservationsService('user-uuid', [], {
      page: 1,
      perPage: 20,
    });

    expect(mockFindReservations).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'user-uuid', isAdminOrManager: false })
    );
    expect(result.data).toHaveLength(1);
  });

  it('should return all reservations for user with bookings:write permission', async () => {
    mockFindReservations.mockResolvedValue({ reservations: [mockReservation], total: 1 });

    const result = await listReservationsService('user-uuid', ['bookings:write'], {
      page: 1,
      perPage: 20,
    });

    expect(mockFindReservations).toHaveBeenCalledWith(
      expect.objectContaining({ isAdminOrManager: true })
    );
    expect(result.data).toHaveLength(1);
  });
});

describe('getReservationService', () => {
  it('should return reservation for owner', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);

    const result = await getReservationService('rsv-uuid', 'user-uuid', []);

    expect(result.id).toBe('rsv-uuid');
  });

  it('should return reservation for user with bookings:write permission', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);

    const result = await getReservationService('rsv-uuid', 'other-uuid', ['bookings:write']);

    expect(result.id).toBe('rsv-uuid');
  });

  it('should throw 403 if non-owner without bookings:write tries to access', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);

    const err = await getReservationService('rsv-uuid', 'other-uuid', []).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it('should throw 404 if reservation not found', async () => {
    mockFindReservationById.mockResolvedValue(null);

    const err = await getReservationService('bad-uuid', 'user-uuid', []).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });
});

// ============================================================
// Reservation Mutations
// ============================================================

describe('updateReservationService', () => {
  it('should allow owner to update notes', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);
    mockUpdateReservation.mockResolvedValue({ ...mockReservation, notes: 'Updated note' });

    const result = await updateReservationService(
      'rsv-uuid',
      { notes: 'Updated note' },
      'user-uuid',
      []
    );

    expect(result.notes).toBe('Updated note');
  });

  it('should allow owner to cancel own reservation', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);
    mockUpdateReservation.mockResolvedValue({ ...mockReservation, status: 'cancelled' });

    const result = await updateReservationService(
      'rsv-uuid',
      { status: 'cancelled' },
      'user-uuid',
      []
    );

    expect(result.status).toBe('cancelled');
  });

  it('should throw 403 if employee tries to update quantity', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);

    const err = await updateReservationService(
      'rsv-uuid',
      { quantity: 2 },
      'user-uuid',
      []
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it('should allow bookings:write user to update quantity', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);
    mockUpdateReservation.mockResolvedValue({ ...mockReservation, quantity: 2 });

    const result = await updateReservationService(
      'rsv-uuid',
      { quantity: 2 },
      'manager-uuid',
      ['bookings:write']
    );

    expect(result.quantity).toBe(2);
  });

  it('should throw 409 if reservation is not pending', async () => {
    mockFindReservationById.mockResolvedValue({ ...mockReservation, status: 'approved' });

    const err = await updateReservationService(
      'rsv-uuid',
      { notes: 'test' },
      'user-uuid',
      []
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('should throw 403 if non-owner without bookings:write tries to update', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);

    const err = await updateReservationService(
      'rsv-uuid',
      { notes: 'test' },
      'other-uuid',
      []
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});

// ============================================================
// Review Flow
// ============================================================

describe('reviewReservationService', () => {
  it('should throw 404 if reservation not found', async () => {
    mockFindReservationById.mockResolvedValue(null);

    const err = await reviewReservationService(
      'bad-uuid',
      { action: 'approve' },
      'reviewer-uuid'
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('should throw 409 if reservation is not pending', async () => {
    mockFindReservationById.mockResolvedValue({ ...mockReservation, status: 'approved' });

    const err = await reviewReservationService(
      'rsv-uuid',
      { action: 'approve' },
      'reviewer-uuid'
    ).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('should reject a reservation without transaction', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);
    mockUpdateReservation.mockResolvedValue({
      ...mockReservation,
      status: 'rejected',
      reviewedBy: 'reviewer-uuid',
      reviewedAt: new Date(),
    });

    const result = await reviewReservationService(
      'rsv-uuid',
      { action: 'reject' },
      'reviewer-uuid'
    );

    expect(result.status).toBe('rejected');
    expect(result.reviewed_by).toBe('reviewer-uuid');
    expect(mockUpdateReservation).toHaveBeenCalledTimes(1);
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it('should approve a reservation using transaction', async () => {
    mockFindReservationById.mockResolvedValue(mockReservation);
    mockPrismaTransaction.mockResolvedValue({
      ...mockReservation,
      status: 'approved',
      reviewedBy: 'reviewer-uuid',
      reviewedAt: new Date(),
    });

    const result = await reviewReservationService(
      'rsv-uuid',
      { action: 'approve' },
      'reviewer-uuid'
    );

    expect(result.status).toBe('approved');
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });
});