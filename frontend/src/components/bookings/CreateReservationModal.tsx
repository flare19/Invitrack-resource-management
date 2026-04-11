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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateReservation,
  useResources,
  useAvailability,
} from '@/hooks/useBookings'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { CreateReservationBody } from '@/api/bookings'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const createReservationSchema = z.object({
  resource_id: z.string().min(1, 'Resource is required'),
  quantity: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .refine((v) => v >= 1, 'Quantity must be at least 1'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  notes: z.string().max(500).default(''),
}).refine(
  (data) => {
    if (!data.start_time || !data.end_time) return true
    const start = new Date(data.start_time)
    const end = new Date(data.end_time)
    return end > start
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
)

type CreateReservationFormValues = z.infer<typeof createReservationSchema>

type CreateReservationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateReservationModal({
  open,
  onOpenChange,
}: CreateReservationModalProps) {
  const { data: resourcesData, isLoading: isLoadingResources } = useResources({ per_page: 100 })
  const createReservation = useCreateReservation()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      resource_id: '',
      quantity: 1,
      start_time: '',
      end_time: '',
      notes: '',
    },
  })

  const resourceId = watch('resource_id')
  const quantity = watch('quantity') as number
  const startTime = watch('start_time')
  const endTime = watch('end_time')

  // Fetch availability when all required fields are set
  const { data: availability, isLoading: isCheckingAvailability } = useAvailability(
    resourceId || undefined,
    startTime || undefined,
    endTime || undefined
  )

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleResourceChange(value: string) {
    setValue('resource_id', value)
  }

  async function onSubmit(data: unknown): Promise<void> {
    const values = data as CreateReservationFormValues

    // Validate end_time > start_time
    const start = new Date(values.start_time)
    const end = new Date(values.end_time)
    if (end <= start) {
      return // Form validation should catch this, but double-check
    }

    const body: CreateReservationBody = {
      resource_id: values.resource_id,
      quantity: values.quantity,
      start_time: values.start_time,
      end_time: values.end_time,
      ...(values.notes && { notes: values.notes }),
      ...(quantityExceedsAvailability && canOverride && { override: true }),
    }

    try {
      await createReservation.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled by mutation error state
    }
  }

  const { permissions } = useAuth()
  const canOverride = permissions.includes('bookings:override')

  function getErrorMessage(): string | null {
    if (!createReservation.error) return null
    const err = createReservation.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409)
      return 'Requested quantity not available for this time window.'
    if (err.response?.status === 404)
      return 'Resource no longer available.'
    return 'Failed to create reservation. Please try again.'
  }

  // Check if quantity exceeds availability
  const quantityExceedsAvailability =
    availability && quantity > availability.available_quantity

  const serverError = getErrorMessage()
  const selectedResource = resourcesData?.data?.find((r) => r.id === resourceId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource_id">Resource</Label>
            <Select value={resourceId || ''} onValueChange={handleResourceChange} disabled={isLoadingResources}>
              <SelectTrigger id="resource_id">
                <SelectValue placeholder={isLoadingResources ? "Loading resources..." : "Select a resource"} />
              </SelectTrigger>
              <SelectContent>
                {resourcesData?.data && resourcesData.data.length > 0 ? (
                  resourcesData.data.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    {isLoadingResources ? 'Loading...' : 'No resources available'}
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.resource_id && (
              <p className="text-sm text-destructive">{errors.resource_id.message}</p>
            )}
          </div>

          {selectedResource && (
            <p className="text-xs text-muted-foreground">
              Available: {selectedResource.quantity} units
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register('quantity')}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_time">Start Time</Label>
            <Input id="start_time" type="datetime-local" {...register('start_time')} />
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

          {resourceId && startTime && endTime && (
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
            <p className={`text-sm flex items-center gap-1.5 ${canOverride ? 'text-amber-500' : 'text-destructive'}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {canOverride
                ? 'Quantity exceeds availability. Submitting will override lower-priority reservations.'
                : 'Requested quantity exceeds available quantity.'}
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
                createReservation.isPending ||
                (quantityExceedsAvailability && !canOverride)
              }
            >
              Create Reservation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
