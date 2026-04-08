import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReservationsListPage from '@/pages/bookings/ReservationsListPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as bookingsApi from '@/api/bookings'

vi.mock('@/api/bookings', () => ({
  getReservations: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockReservations = [
  {
    id: 'res-1',
    resource_id: 'res-resource-1',
    requested_by: 'user-1',
    quantity: 2,
    start_time: '2024-02-01T09:00:00Z',
    end_time: '2024-02-01T17:00:00Z',
    status: 'pending' as const,
    priority: 10,
    notes: 'Need for workshop',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2024-01-30T10:00:00Z',
    updated_at: '2024-01-30T10:00:00Z',
  },
]

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

function renderReservationsListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/bookings']}>
        <Routes>
          <Route path="/bookings" element={<ReservationsListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReservationsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(bookingsApi.getReservations).mockResolvedValue({
      data: mockReservations,
      meta: { page: 1, per_page: 20, total: 50 },
    })
  })

  it('renders the reservations list page header', async () => {
    renderReservationsListPage()
    await waitFor(() => {
      expect(screen.getByText('Reservations')).toBeInTheDocument()
    })
  })

  it('shows New Reservation button', async () => {
    renderReservationsListPage()
    await waitFor(() => {
      expect(screen.getByText('New Reservation')).toBeInTheDocument()
    })
  })

  it('renders list of reservations', async () => {
    renderReservationsListPage()
    await waitFor(() => {
      // Check for quantity that's in the first reservation
      expect(screen.getByText(/Quantity: 2/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no reservations exist', async () => {
    vi.mocked(bookingsApi.getReservations).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0 },
    })
    renderReservationsListPage()
    await waitFor(() => {
      expect(screen.getByText('No reservations found.')).toBeInTheDocument()
    })
  })

  it('calls getReservations with correct initial params', async () => {
    renderReservationsListPage()
    await waitFor(() => {
      expect(bookingsApi.getReservations).toHaveBeenCalledWith({
        page: 1,
        per_page: 20,
      })
    })
  })

  it('shows pagination controls when total exceeds per_page', async () => {
    vi.mocked(bookingsApi.getReservations).mockResolvedValue({
      data: mockReservations,
      meta: { page: 1, per_page: 1, total: 10 },
    })
    renderReservationsListPage()
    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  it('disables Previous button on first page', async () => {
    renderReservationsListPage()
    await waitFor(() => {
      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()
    })
  })

  it('shows user filter when user has bookings:approve permission', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        permissions: ['bookings:approve'],
      })
    )
    renderReservationsListPage()
    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })
})
