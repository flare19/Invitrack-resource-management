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
import { Label } from '@/components/ui/label'
import { useReviewReservation } from '@/hooks/useBookings'
import { useState } from 'react'

const reviewSchema = z.object({
  notes: z.string().max(500).default(''),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

type ReviewActionsProps = {
  reservationId: string
  onSuccess?: () => void
  compact?: boolean
}

export function ReviewActions({
  reservationId,
  onSuccess,
  compact = false,
}: ReviewActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const reviewMutation = useReviewReservation(reservationId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      notes: '',
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    setIsOpen(next)
  }

  async function onSubmit(values: ReviewFormValues): Promise<void> {
    try {
      await reviewMutation.mutateAsync({
        action,
        ...(values.notes && { notes: values.notes }),
      })
      reset()
      setIsOpen(false)
      onSuccess?.()
    } catch {
      // error handled by mutation state
    }
  }

  function getErrorMessage(): string | null {
    if (!reviewMutation.error) return null
    const err = reviewMutation.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409)
      return 'This reservation is no longer pending or no longer available.'
    return 'Failed to review reservation. Please try again.'
  }

  const serverError = getErrorMessage()

  if (compact) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review Reservation</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={action === 'approve' ? 'default' : 'outline'}
                  onClick={() => setAction('approve')}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant={action === 'reject' ? 'default' : 'outline'}
                  onClick={() => setAction('reject')}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  placeholder="Reviewer comment..."
                  {...register('notes')}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  rows={3}
                />
              </div>

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
                  disabled={isSubmitting || reviewMutation.isPending}
                >
                  Submit Review
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction('approve')
              setIsOpen(true)
            }}
            disabled={reviewMutation.isPending}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction('reject')
              setIsOpen(true)
            }}
            disabled={reviewMutation.isPending}
          >
            Reject
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Reservation</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={action === 'approve' ? 'default' : 'outline'}
                onClick={() => setAction('approve')}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                type="button"
                variant={action === 'reject' ? 'default' : 'outline'}
                onClick={() => setAction('reject')}
                className="flex-1"
              >
                Reject
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                placeholder="Reviewer comment..."
                {...register('notes')}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
              />
            </div>

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
                disabled={isSubmitting || reviewMutation.isPending}
              >
                Submit Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        onClick={() => {
          setAction('approve')
          setIsOpen(true)
        }}
        disabled={reviewMutation.isPending}
      >
        Review
      </Button>
    </>
  )
}
