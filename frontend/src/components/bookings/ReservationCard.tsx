import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react'
import type { Reservation } from '@/types/bookings'

type ReservationCardProps = {
  reservation: Reservation
  resourceName?: string
  onCancel?: () => void
  onApprove?: () => void
  onReject?: () => void
  showActions?: boolean
  showCancelButton?: boolean
  showReviewActions?: boolean
  isLoading?: boolean
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const, color: 'text-amber-700' },
  approved: { label: 'Approved', variant: 'default' as const, color: 'text-green-700' },
  rejected: { label: 'Rejected', variant: 'secondary' as const, color: 'text-red-700' },
  cancelled: { label: 'Cancelled', variant: 'secondary' as const, color: 'text-gray-700' },
}

export function ReservationCard({
  reservation,
  resourceName = 'Unknown Resource',
  onCancel,
  onApprove,
  onReject,
  showActions = true,
  showCancelButton = false,
  showReviewActions = false,
  isLoading = false,
}: ReservationCardProps) {
  const config = statusConfig[reservation.status]
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

  return (
    <Link
      to={`/bookings/${reservation.id}`}
      className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold truncate">{resourceName}</h3>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Quantity: {reservation.quantity}
          </p>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>
              {formatTime(startDate)} → {formatTime(endDate)}
            </span>
          </div>

          {reservation.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              Notes: {reservation.notes}
            </p>
          )}

          {reservation.reviewed_at && (
            <p className="text-xs text-muted-foreground mt-2">
              {reservation.status === 'approved' && '✓ '}
              {reservation.status === 'rejected' && '✗ '}
              Reviewed:{' '}
              {new Date(reservation.reviewed_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {showCancelButton && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  onCancel?.()
                }}
                disabled={isLoading}
                title="Cancel reservation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {showReviewActions && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    onApprove?.()
                  }}
                  disabled={isLoading}
                  title="Approve"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    onReject?.()
                  }}
                  disabled={isLoading}
                  title="Reject"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
