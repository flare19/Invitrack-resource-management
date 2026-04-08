import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Availability } from '@/types/bookings'

type AvailabilityBadgeProps = {
  availability?: Availability | undefined
  isLoading?: boolean
  requestedQuantity?: number | undefined
}

export function AvailabilityBadge({
  availability,
  isLoading,
  requestedQuantity,
}: AvailabilityBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        Checking availability...
      </div>
    )
  }

  if (!availability) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a resource and time window to check availability
      </div>
    )
  }

  const isAvailable =
    requestedQuantity !== undefined &&
    availability.available_quantity >= requestedQuantity

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        {isAvailable ? (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
        )}
        <div className="flex-1 min-w-0 text-sm">
          {requestedQuantity !== undefined ? (
            <>
              <div className="font-medium mb-1">
                {isAvailable ? (
                  <span className="text-green-700">
                    {availability.available_quantity} available
                  </span>
                ) : (
                  <span className="text-amber-700">
                    Only {availability.available_quantity} available (need{' '}
                    {requestedQuantity})
                  </span>
                )}
              </div>
            </>
          ) : null}
          <div className="text-muted-foreground space-y-1">
            <div>Total: {availability.total_quantity}</div>
            <div>Reserved: {availability.reserved_quantity}</div>
            <div>Available: {availability.available_quantity}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
