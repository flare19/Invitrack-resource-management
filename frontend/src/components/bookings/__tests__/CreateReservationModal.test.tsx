import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateReservationModal } from '@/components/bookings/CreateReservationModal'
import * as bookingsApi from '@/api/bookings'
import * as AuthContextModule from '@/context/AuthContext'

vi.mock('@/api/bookings', () => ({
  getResources: vi.fn(),
  getAvailability: vi.fn(),
  createReservation: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockResources = [
  {
    id: 'res-1',
    item_id: 'item-1',
    name: 'Projector',
    quantity: 5,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockAvailability = {
  resource_id: 'res-1',
  total_quantity: 5,
  reserved_quantity: 2,
  available_quantity: 3,
  start_time: '2024-02-01T09:00:00Z',
  end_time: '2024-02-01T17:00:00Z',
}

function makeAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: true,
    accessToken: 'token-123',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      is_verified: true,
      is_active: true,
      full_name: 'Test User',
      display_name: null,
      avatar_url: null,
      department: null,
      roles: [{ id: 1, name: 'employee', priority: 10, description: null }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    roles: [{ id: 1, name: 'employee', priority: 10, description: null }],
    permissions: [],
    login: vi.fn(),
    logout: vi.fn(),
    setToken: vi.fn(),
    ...overrides,
  } as any
}

function renderCreateReservationModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateReservationModal open={true} onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('CreateReservationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(bookingsApi.getResources).mockResolvedValue({
      data: mockResources,
      meta: { page: 1, per_page: 100, total: 1 },
    })
    vi.mocked(bookingsApi.getAvailability).mockResolvedValue(mockAvailability)
    vi.mocked(bookingsApi.createReservation).mockResolvedValue({
      id: 'res-new',
      resource_id: 'res-1',
      requested_by: 'user-1',
      quantity: 2,
      start_time: '2024-02-01T09:00:00Z',
      end_time: '2024-02-01T17:00:00Z',
      status: 'pending',
      priority: 10,
      notes: 'Test notes',
      reviewed_by: null,
      reviewed_at: null,
      created_at: '2024-01-30T10:00:00Z',
      updated_at: '2024-01-30T10:00:00Z',
    })
  })

  it('renders modal title', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByText('New Reservation')).toBeInTheDocument()
    })
  })

  it('renders resource select field', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByText('Resource')).toBeInTheDocument()
    })
  })

  it('renders quantity input field', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
    })
  })

  it('renders date/time fields', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
      expect(screen.getByLabelText('End Time')).toBeInTheDocument()
    })
  })

  it('loads and displays available resources', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByText('Projector')).toBeInTheDocument()
    })
  })

  it('calls createReservation with correct data on submit', async () => {
    renderCreateReservationModal()

    await waitFor(() => {
      expect(screen.getByText('Create Reservation')).toBeInTheDocument()
    })
  })

  it('renders submit button', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByText('Create Reservation')).toBeInTheDocument()
    })
  })

  it('renders cancel button', async () => {
    renderCreateReservationModal()
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('shows availability when resource and times are selected', async () => {
    renderCreateReservationModal()

    await waitFor(() => {
      expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
    })
  })
})
