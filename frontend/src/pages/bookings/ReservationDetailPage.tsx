import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useReservation, useCancelReservation } from '@/hooks/useBookings'
import { ReviewActions } from '@/components/bookings/ReviewActions'
import { EditReservationModal } from '@/components/bookings/EditReservationModal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { permissions, user } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  const canApprove = permissions.includes('bookings:approve')
  const canEdit = permissions.includes('bookings:write') || user?.id
  const canCancel = true // users can cancel their own, admins any

  const { data: reservation, isLoading, error } = useReservation(id!)
  const cancelMutation = useCancelReservation()

  if (!id) return <PageError message="Reservation ID not found" />

  if (isLoading) return <LoadingSpinner />

  if (error || !reservation) {
    return (
      <PageError
        message="Failed to load reservation"
        onRetry={() => window.location.reload()}
      />
    )
  }

  async function handleCancel() {
    if (!confirm('Cancel this reservation? This cannot be undone.')) return
    try {
      await cancelMutation.mutateAsync(reservation!.id)
      navigate('/bookings')
    } catch {
      // error handled by mutation state
    }
  }

  const startDate = new Date(reservation.start_time)
  const endDate = new Date(reservation.end_time)

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusColorMap = {
    pending: 'text-amber-700',
    approved: 'text-green-700',
    rejected: 'text-red-700',
    cancelled: 'text-gray-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/bookings')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reservations
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservation #{reservation.id.slice(-8)}</h1>
          <p className={`text-sm font-semibold mt-1 capitalize ${statusColorMap[reservation.status]}`}>
            {reservation.status}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && reservation.status === 'pending' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canApprove && reservation.status === 'pending' && (
            <ReviewActions
              reservationId={reservation.id}
              onSuccess={() => navigate('/bookings')}
            />
          )}
          {canCancel && reservation.status !== 'cancelled' && reservation.status !== 'rejected' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Reservation Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Resource ID</dt>
              <dd className="font-medium">{reservation.resource_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="font-medium">{reservation.quantity}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Start Time</dt>
              <dd className="font-medium">{formatTime(startDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">End Time</dt>
              <dd className="font-medium">{formatTime(endDate)}</dd>
            </div>
            {reservation.notes && (
              <div>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium">{reservation.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Request Information</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className={`font-medium capitalize ${statusColorMap[reservation.status]}`}>
                {reservation.status}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="font-medium">{reservation.priority}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Requested By</dt>
              <dd className="font-medium text-xs font-mono">{reservation.requested_by}</dd>
            </div>
            {reservation.reviewed_at && (
              <>
                <div>
                  <dt className="text-muted-foreground">Reviewed At</dt>
                  <dd className="font-medium">
                    {new Date(reservation.reviewed_at).toLocaleString()}
                  </dd>
                </div>
                {reservation.reviewed_by && (
                  <div>
                    <dt className="text-muted-foreground">Reviewed By</dt>
                    <dd className="font-medium text-xs font-mono">{reservation.reviewed_by}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt className="text-muted-foreground">Created At</dt>
              <dd className="font-medium">
                {new Date(reservation.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <EditReservationModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        reservationId={reservation.id}
        reservation={reservation}
      />
    </div>
  )
}
