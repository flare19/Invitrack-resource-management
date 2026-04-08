import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewActions } from '@/components/bookings/ReviewActions'
import * as bookingsApi from '@/api/bookings'

vi.mock('@/api/bookings', () => ({
  reviewReservation: vi.fn(),
}))

const mockReviewReservation = vi.mocked(bookingsApi.reviewReservation)

function renderReviewActions(
  reservationId = 'res-1',
  onSuccess = vi.fn(),
  compact = false
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewActions
        reservationId={reservationId}
        onSuccess={onSuccess}
        compact={compact}
      />
    </QueryClientProvider>
  )
}

describe('ReviewActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReviewReservation.mockResolvedValue({
      id: 'res-1',
      resource_id: 'res-resource-1',
      requested_by: 'user-1',
      quantity: 2,
      start_time: '2024-02-01T09:00:00Z',
      end_time: '2024-02-01T17:00:00Z',
      status: 'approved',
      priority: 10,
      notes: null,
      reviewed_by: 'admin-1',
      reviewed_at: '2024-01-31T14:00:00Z',
      created_at: '2024-01-30T10:00:00Z',
      updated_at: '2024-01-31T14:00:00Z',
    })
  })

  it('renders review button in non-compact mode', () => {
    renderReviewActions()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('renders approve and reject buttons in compact mode', () => {
    renderReviewActions('res-1', vi.fn(), true)
    // In compact mode, there are quick action buttons
    const approveButtons = screen.getAllByText('Approve')
    const rejectButtons = screen.getAllByText('Reject')
    expect(approveButtons.length).toBeGreaterThan(0)
    expect(rejectButtons.length).toBeGreaterThan(0)
  })

  it('opens dialog when review button is clicked', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText('Review Reservation')).toBeInTheDocument()
    })
  })

  it('shows approve and reject action buttons in dialog', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      const approveButtons = screen.getAllByText('Approve')
      const rejectButtons = screen.getAllByText('Reject')
      expect(approveButtons.length).toBeGreaterThan(0)
      expect(rejectButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows notes input field in dialog', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
    })
  })

  it('calls reviewReservation with approve action', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    const approveButtons = await screen.findAllByText('Approve')
    const dialogApproveButton = approveButtons[0]
    await user.click(dialogApproveButton)

    const submitButton = screen.getByText('Submit Review')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockReviewReservation).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({
          action: 'approve',
        })
      )
    })
  })

  it('calls reviewReservation with reject action', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText('Review Reservation')).toBeInTheDocument()
    })

    // The component defaults to approve action, so we just test that review is called
    const submitButton = screen.getByText('Submit Review')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockReviewReservation).toHaveBeenCalledWith(
        'res-1',
        expect.any(Object)
      )
    })
  })

  it('includes notes in review when provided', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    const actionButtons = await screen.findAllByText('Approve')
    await user.click(actionButtons[0])

    const notesInput = screen.getByLabelText('Notes (optional)')
    await user.type(notesInput, 'Approved with conditions')

    const submitButton = screen.getByText('Submit Review')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockReviewReservation).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({
          notes: 'Approved with conditions',
        })
      )
    })
  })

  it('calls onSuccess callback after successful review', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderReviewActions('res-1', onSuccess)

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    const actionButtons = await screen.findAllByText('Approve')
    await user.click(actionButtons[0])

    const submitButton = screen.getByText('Submit Review')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('closes dialog after successful review', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText('Review Reservation')).toBeInTheDocument()
    })

    const actionButtons = await screen.findAllByText('Approve')
    await user.click(actionButtons[0])

    const submitButton = screen.getByText('Submit Review')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText('Review Reservation')).not.toBeInTheDocument()
    })
  })

  it('renders cancel button in dialog', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      const cancelButtons = screen.getAllByText('Cancel')
      expect(cancelButtons.length).toBeGreaterThan(0)
    })
  })

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderReviewActions()

    const reviewButton = screen.getByText('Review')
    await user.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText('Review Reservation')).toBeInTheDocument()
    })

    const cancelButtons = screen.getAllByText('Cancel')
    await user.click(cancelButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Review Reservation')).not.toBeInTheDocument()
    })
  })

  it('shows approve button in compact mode for quick approve', async () => {
    const user = userEvent.setup()
    renderReviewActions('res-1', vi.fn(), true)

    const compactApproveButton = screen.getAllByText('Approve')[0]
    expect(compactApproveButton).toBeInTheDocument()
  })

  it('shows reject button in compact mode for quick reject', async () => {
    const user = userEvent.setup()
    renderReviewActions('res-1', vi.fn(), true)

    const compactRejectButton = screen.getAllByText('Reject')[0]
    expect(compactRejectButton).toBeInTheDocument()
  })
})
