import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReservationCard } from '@/components/bookings/ReservationCard'
import type { Reservation } from '@/types/bookings'

const mockReservation: Reservation = {
  id: 'res-1',
  resource_id: 'res-resource-1',
  requested_by: 'user-1',
  quantity: 2,
  start_time: '2024-02-01T09:00:00Z',
  end_time: '2024-02-01T17:00:00Z',
  status: 'pending',
  priority: 10,
  notes: 'Need for workshop',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2024-01-30T10:00:00Z',
  updated_at: '2024-01-30T10:00:00Z',
}

function renderReservationCard(
  reservation: Reservation = mockReservation,
  props: any = {}
) {
  return render(
    <MemoryRouter>
      <ReservationCard reservation={reservation} {...props} />
    </MemoryRouter>
  )
}

describe('ReservationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quantity', () => {
    renderReservationCard()
    expect(screen.getByText(/Quantity: 2/)).toBeInTheDocument()
  })

  it('renders start and end times', () => {
    renderReservationCard()
    // Times are in local timezone, just verify the arrow separator exists
    expect(screen.getByText((content) => content.includes('→'))).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderReservationCard()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    renderReservationCard()
    expect(screen.getByText(/Notes: Need for workshop/)).toBeInTheDocument()
  })

  it('hides notes when not present', () => {
    const resNoNotes: Reservation = { ...mockReservation, notes: null }
    renderReservationCard(resNoNotes)
    expect(screen.queryByText(/Notes:/)).not.toBeInTheDocument()
  })

  it('shows reviewed information when reviewed_at exists', () => {
    const reviewedRes: Reservation = {
      ...mockReservation,
      reviewed_at: '2024-01-31T14:00:00Z',
      reviewed_by: 'admin-1',
    }
    renderReservationCard(reviewedRes)
    expect(screen.getByText(/Reviewed:/)).toBeInTheDocument()
  })

  it('hides reviewed information when not reviewed', () => {
    renderReservationCard()
    expect(screen.queryByText(/Reviewed:/)).not.toBeInTheDocument()
  })

  it('links to detail page', () => {
    const { container } = renderReservationCard()
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/bookings/res-1')
  })

  it('renders status "Approved" when status is approved', () => {
    const approvedRes: Reservation = { ...mockReservation, status: 'approved' }
    renderReservationCard(approvedRes)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders status "Rejected" when status is rejected', () => {
    const rejectedRes: Reservation = { ...mockReservation, status: 'rejected' }
    renderReservationCard(rejectedRes)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('renders status "Cancelled" when status is cancelled', () => {
    const cancelledRes: Reservation = { ...mockReservation, status: 'cancelled' }
    renderReservationCard(cancelledRes)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('renders custom resource name when provided', () => {
    renderReservationCard(mockReservation, { resourceName: 'Projector XL' })
    expect(screen.getByText('Projector XL')).toBeInTheDocument()
  })

  it('renders default resource name when not provided', () => {
    const { container } = renderReservationCard(mockReservation, {
      resourceName: undefined,
    })
    expect(screen.getByText('Unknown Resource')).toBeInTheDocument()
  })
})
