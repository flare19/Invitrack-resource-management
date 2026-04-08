import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReservationDetailPage from '@/pages/bookings/ReservationDetailPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as bookingsApi from '@/api/bookings'

vi.mock('@/api/bookings', () => ({
  getReservation: vi.fn(),
  updateReservation: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockReservation = {
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

function renderReservationDetailPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/bookings/res-1']}>
        <Routes>
          <Route path="/bookings/:id" element={<ReservationDetailPage />} />
          <Route path="/bookings" element={<div>Bookings List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReservationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(bookingsApi.getReservation).mockResolvedValue(mockReservation)
    vi.mocked(bookingsApi.updateReservation).mockResolvedValue({
      ...mockReservation,
      status: 'cancelled',
    })
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('renders the reservation detail header', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText(/Reservation #/)).toBeInTheDocument()
    })
  })

  it('displays reservation status', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      // Get all elements with 'pending' and check at least one exists
      const pendingElements = screen.getAllByText('pending')
      expect(pendingElements.length).toBeGreaterThan(0)
    })
  })

  it('renders back button', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('Back to Reservations')).toBeInTheDocument()
    })
  })

  it('displays reservation details (resource ID, quantity, times)', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('res-resource-1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('displays request information (priority, requester, timestamps)', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument() // priority
      expect(screen.getByText(/user-1/)).toBeInTheDocument()
    })
  })

  it('shows cancel button when reservation is pending', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('hides cancel button when reservation is cancelled', async () => {
    vi.mocked(bookingsApi.getReservation).mockResolvedValue({
      ...mockReservation,
      status: 'cancelled',
    })
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  it('hides cancel button when reservation is rejected', async () => {
    vi.mocked(bookingsApi.getReservation).mockResolvedValue({
      ...mockReservation,
      status: 'rejected',
    })
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  it('prompts for confirmation before cancelling', async () => {
    const user = userEvent.setup()
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    expect(confirm).toHaveBeenCalledWith('Cancel this reservation? This cannot be undone.')
  })

  it('shows notes when they exist', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('Need for workshop')).toBeInTheDocument()
    })
  })

  it('hides notes section when notes are empty', async () => {
    vi.mocked(bookingsApi.getReservation).mockResolvedValue({
      ...mockReservation,
      notes: null,
    })
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.queryByText('Need for workshop')).not.toBeInTheDocument()
    })
  })

  it('does not show review action when user lacks bookings:approve permission', async () => {
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.queryByText('Review')).not.toBeInTheDocument()
    })
  })

  it('shows review action when user has bookings:approve permission and status is pending', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        permissions: ['bookings:approve'],
      })
    )
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument()
    })
  })

  it('hides review action when status is not pending', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        permissions: ['bookings:approve'],
      })
    )
    vi.mocked(bookingsApi.getReservation).mockResolvedValue({
      ...mockReservation,
      status: 'approved',
    })
    renderReservationDetailPage()
    await waitFor(() => {
      expect(screen.queryByText('Review')).not.toBeInTheDocument()
    })
  })
})
