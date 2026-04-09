import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateReservation, useAvailability } from '@/hooks/useBookings'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { UpdateReservationBody } from '@/api/bookings'
import type { Reservation } from '@/types/bookings'

const editReservationSchema = z
  .object({
    quantity: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
      .refine((v) => v >= 1, 'Quantity must be at least 1'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    notes: z.string().max(500).default(''),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  })

type EditReservationFormValues = z.infer<typeof editReservationSchema>

type EditReservationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: string
  reservation: Reservation
}

export function EditReservationModal({
  open,
  onOpenChange,
  reservationId,
  reservation,
}: EditReservationModalProps) {
  const updateReservation = useUpdateReservation(reservationId)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editReservationSchema),
    defaultValues: {
      quantity: reservation.quantity,
      start_time: reservation.start_time.slice(0, 16), // ISO format for datetime-local
      end_time: reservation.end_time.slice(0, 16),
      notes: reservation.notes ?? '',
    },
  })

  const quantity = watch('quantity') as number
  const startTime = watch('start_time')
  const endTime = watch('end_time')

  // Check availability for new time window
  const { data: availability, isLoading: isCheckingAvailability } = useAvailability(
    reservation.resource_id,
    startTime || undefined,
    endTime || undefined
  )

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(data: unknown): Promise<void> {
    const values = data as EditReservationFormValues

    // Check availability
    if (availability && values.quantity > availability.available_quantity) {
      return // UI should prevent submit
    }

    const body: UpdateReservationBody = {
      quantity: values.quantity,
      start_time: values.start_time,
      end_time: values.end_time,
      ...(values.notes && { notes: values.notes }),
    }

    try {
      await updateReservation.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled by mutation error state
    }
  }

  function getErrorMessage(): string | null {
    if (!updateReservation.error) return null
    const err = updateReservation.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409)
      return 'This reservation is no longer pending or was modified by another user.'
    if (err.response?.status === 422)
      return 'Please check the form for invalid values.'
    if (err.response?.status === 403)
      return 'You do not have permission to edit this reservation.'
    return 'Failed to update reservation. Please try again.'
  }

  const quantityExceedsAvailability =
    availability && quantity > availability.available_quantity

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min={1} {...register('quantity')} />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="datetime-local"
              {...register('start_time')}
            />
            {errors.start_time && (
              <p className="text-sm text-destructive">{errors.start_time.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end_time">End Time</Label>
            <Input id="end_time" type="datetime-local" {...register('end_time')} />
            {errors.end_time && (
              <p className="text-sm text-destructive">{errors.end_time.message}</p>
            )}
          </div>

          {startTime && endTime && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Availability</Label>
              <AvailabilityBadge
                availability={availability}
                isLoading={isCheckingAvailability}
                requestedQuantity={quantity}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              placeholder="Additional details..."
              {...register('notes')}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              rows={3}
            />
          </div>

          {quantityExceedsAvailability && (
            <p className="text-sm text-destructive">
              Requested quantity exceeds available quantity.
            </p>
          )}

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                updateReservation.isPending ||
                quantityExceedsAvailability
              }
            >
              Update Reservation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
