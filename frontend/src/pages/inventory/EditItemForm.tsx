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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateItem, useCategories } from '@/hooks/useInventory'
import { useCreateResource } from '@/hooks/useBookings'
import type { UpdateItemBody } from '@/api/inventory'
import type { CreateResourceBody } from '@/api/bookings'

const editItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  reorder_threshold: z.coerce.number().int().min(0),
  is_bookable: z.boolean(),
})

type EditItemFormValues = z.infer<typeof editItemSchema>

type EditItemFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  item: {
    sku: string
    name: string
    unit: string
    description?: string | null
    category_id?: string | null
    reorder_threshold: number
    is_bookable: boolean
    version: number
  }
}

export function EditItemForm({
  open,
  onOpenChange,
  itemId,
  item,
}: EditItemFormProps) {
  const { data: categories } = useCategories()
  const updateItem = useUpdateItem(itemId)
  const createResource = useCreateResource()
  const wasBookableBefore = item.is_bookable

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: item.name,
      unit: item.unit,
      description: item.description || '',
      category_id: item.category_id || 'none',
      reorder_threshold: item.reorder_threshold,
      is_bookable: item.is_bookable,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(values: EditItemFormValues) {
    const body: UpdateItemBody = {
      version: item.version,
      name: values.name,
      unit: values.unit,
      ...(values.description && { description: values.description }),
      ...(values.category_id && values.category_id !== 'none' && {
        category_id: values.category_id,
      }),
      ...(values.reorder_threshold !== undefined && {
        reorder_threshold: values.reorder_threshold,
      }),
      ...(values.is_bookable !== undefined && {
        is_bookable: values.is_bookable,
      }),
    }

    try {
      const updatedItem = await updateItem.mutateAsync(body)

      // If is_bookable changed from false to true, create a resource
      if (!wasBookableBefore && values.is_bookable) {
        const resourceBody: CreateResourceBody = {
          item_id: itemId,
          name: updatedItem.name,
          quantity: 1,
        }
        await createResource.mutateAsync(resourceBody)
      }

      reset()
      onOpenChange(false)
    } catch {
      // 409 and 422 error display handled below via updateItem.error
    }
  }

  const categoryValue = watch('category_id')
  const isBookable = watch('is_bookable')

  function getErrorMessage(): string | null {
    if (!updateItem.error) return null
    const err = updateItem.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409) return 'This item was modified by another user. Please refresh and try again.'
    if (err.response?.status === 422) return 'Please check the form for invalid values.'
    return 'Something went wrong. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>SKU</Label>
            <div className="text-sm text-muted-foreground">{item.sku}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="e.g. pcs, kg, litres" {...register('unit')} />
            {errors.unit && (
              <p className="text-sm text-destructive">{errors.unit.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={categoryValue ?? 'none'}
              onValueChange={(val) => setValue('category_id', val)}
            >
              <SelectTrigger id="category_id">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reorder_threshold">Reorder Threshold</Label>
            <Input
              id="reorder_threshold"
              type="number"
              min={0}
              {...register('reorder_threshold')}
            />
            {errors.reorder_threshold && (
              <p className="text-sm text-destructive">
                {errors.reorder_threshold.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_bookable"
              checked={isBookable ?? false}
              onCheckedChange={(checked) =>
                setValue('is_bookable', checked === true)
              }
            />
            <Label htmlFor="is_bookable">Bookable</Label>
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
            <Button type="submit" disabled={isSubmitting || updateItem.isPending}>
              Update Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
