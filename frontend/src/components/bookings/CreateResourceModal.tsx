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
import { useCreateResource } from '@/hooks/useBookings'
import { useItems } from '@/hooks/useInventory'
import type { CreateResourceBody } from '@/api/bookings'

const createResourceSchema = z.object({
  item_id: z.string().min(1, 'Item is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .refine((v) => v >= 1, 'Quantity must be at least 1'),
})

type CreateResourceFormValues = z.infer<typeof createResourceSchema>

type CreateResourceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateResourceModal({
  open,
  onOpenChange,
}: CreateResourceModalProps) {
  const { data: itemsData } = useItems({
    is_bookable: true,
    per_page: 100,
  })
  const createResource = useCreateResource()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createResourceSchema),
    defaultValues: {
      item_id: '',
      name: '',
      quantity: 1,
    },
  })

  const bookableItems = itemsData?.data ?? []

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleItemChange(value: string) {
    setValue('item_id', value)
    // Pre-fill name from selected item
    const selectedItem = bookableItems.find((item) => item.id === value)
    if (selectedItem) {
      setValue('name', selectedItem.name)
    }
  }

  async function onSubmit(data: unknown): Promise<void> {
    const values = data as CreateResourceFormValues

    const body: CreateResourceBody = {
      item_id: values.item_id,
      name: values.name,
      quantity: values.quantity,
    }

    try {
      await createResource.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled by mutation error state
    }
  }

  function getErrorMessage(): string | null {
    if (!createResource.error) return null
    const err = createResource.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409)
      return 'A resource for this item already exists.'
    if (err.response?.status === 422)
      return 'Please check the form for invalid values.'
    return 'Failed to create resource. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item_id">Bookable Item</Label>
            <Select
              value={''}
              onValueChange={handleItemChange}
            >
              <SelectTrigger id="item_id">
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {bookableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item_id && (
              <p className="text-sm text-destructive">{errors.item_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Resource Name</Label>
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
              disabled={isSubmitting || createResource.isPending}
            >
              Create Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
