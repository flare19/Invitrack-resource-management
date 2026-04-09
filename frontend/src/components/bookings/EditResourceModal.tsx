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
import { Checkbox } from '@/components/ui/checkbox'
import { useUpdateResource } from '@/hooks/useBookings'
import type { UpdateResourceBody } from '@/api/bookings'
import type { Resource } from '@/types/bookings'

const editResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .refine((v) => v >= 1, 'Quantity must be at least 1'),
  is_active: z.boolean().default(true),
})

type EditResourceFormValues = z.infer<typeof editResourceSchema>

type EditResourceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceId: string
  resource: Resource
}

export function EditResourceModal({
  open,
  onOpenChange,
  resourceId,
  resource,
}: EditResourceModalProps) {
  const updateResource = useUpdateResource(resourceId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editResourceSchema),
    defaultValues: {
      name: resource.name,
      quantity: resource.quantity,
      is_active: resource.is_active,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(data: unknown): Promise<void> {
    const values = data as EditResourceFormValues

    const body: UpdateResourceBody = {
      name: values.name,
      quantity: values.quantity,
      is_active: values.is_active,
    }

    try {
      await updateResource.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled by mutation error state
    }
  }

  function getErrorMessage(): string | null {
    if (!updateResource.error) return null
    const err = updateResource.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 422)
      return 'Please check the form for invalid values.'
    if (err.response?.status === 403)
      return 'You do not have permission to edit this resource.'
    return 'Failed to update resource. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

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

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              {...register('is_active')}
            />
            <Label htmlFor="is_active">Active</Label>
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
              disabled={isSubmitting || updateResource.isPending}
            >
              Update Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
