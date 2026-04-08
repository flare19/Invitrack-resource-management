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
import { useCreateLocation } from '@/hooks/useInventory'
import type { CreateLocationBody } from '@/api/inventory'

const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().optional(),
})

type CreateLocationFormValues = z.infer<typeof createLocationSchema>

type CreateLocationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateLocationModal({
  open,
  onOpenChange,
}: CreateLocationModalProps) {
  const createLocation = useCreateLocation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(values: CreateLocationFormValues) {
    const body: CreateLocationBody = {
      name: values.name,
      ...(values.description && { description: values.description }),
    }

    try {
      await createLocation.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled below via createLocation.error
    }
  }

  function getErrorMessage(): string | null {
    if (!createLocation.error) return null
    const err = createLocation.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409)
      return 'A location with this name already exists.'
    if (err.response?.status === 422)
      return 'Please check the form for invalid values.'
    return 'Something went wrong. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Location Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Warehouse, Storage Room, Retail Floor"
              {...register('description')}
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
              disabled={isSubmitting || createLocation.isPending}
            >
              Create Location
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
