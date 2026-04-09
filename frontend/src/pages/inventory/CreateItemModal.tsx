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
import { useCreateItem, useCategories, useLocations, useCreateTransaction } from '@/hooks/useInventory'
import { useCreateResource } from '@/hooks/useBookings'
import type { CreateItemBody } from '@/api/inventory'
import type { CreateResourceBody } from '@/api/bookings'

const createItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  reorder_threshold: z.coerce.number().int().min(0),
  is_bookable: z.boolean(),
  location_id: z.string().optional(),
  initial_quantity: z.coerce.number().int().min(0).optional(),
})

type CreateItemFormValues = z.infer<typeof createItemSchema>

type CreateItemModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateItemModal({ open, onOpenChange }: CreateItemModalProps) {
  const { data: categories } = useCategories()
  const { data: locations } = useLocations()
  const createItem = useCreateItem()
  const createTransaction = useCreateTransaction()
  const createResource = useCreateResource()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      sku: '',
      name: '',
      unit: '',
      description: '',
      category_id: '',
      reorder_threshold: 0,
      is_bookable: false,
      location_id: '',
      initial_quantity: 0,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(values: CreateItemFormValues) {
    const body: CreateItemBody = {
      sku: values.sku,
      name: values.name,
      unit: values.unit,
      category_id: values.category_id,
      ...(values.description && { description: values.description }),
      ...(values.reorder_threshold !== undefined && {
        reorder_threshold: values.reorder_threshold,
      }),
      ...(values.is_bookable !== undefined && {
        is_bookable: values.is_bookable,
      }),
    }

    try {
      const createdItem = await createItem.mutateAsync(body)

      // If location and quantity provided, create a transaction
      if (values.location_id && values.initial_quantity && values.initial_quantity > 0) {
        await createTransaction.mutateAsync({
          item_id: createdItem.id,
          location_id: values.location_id,
          type: 'in',
          quantity_delta: values.initial_quantity,
          notes: 'Initial stock',
        })
      }

      // If bookable, create a resource
      if (values.is_bookable) {
        const resourceBody: CreateResourceBody = {
          item_id: createdItem.id,
          name: createdItem.name,
          quantity: values.initial_quantity && values.initial_quantity > 0 ? values.initial_quantity : 1,
        }
        await createResource.mutateAsync(resourceBody)
      }

      reset()
      onOpenChange(false)
    } catch {
      // 409 and 422 error display handled below via createItem.error
    }
  }

  const categoryValue = watch('category_id')
  const locationValue = watch('location_id')
  const isBookable = watch('is_bookable')

  function getErrorMessage(): string | null {
    if (!createItem.error && !createTransaction.error) return null

    const err = createItem.error || createTransaction.error
    if (!err) return null

    const error = err as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (error.response?.status === 409) return 'An item with this SKU already exists.'
    if (error.response?.status === 422) return 'Please check the form for invalid values.'
    return 'Something went wrong. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} />
            {errors.sku && (
              <p className="text-sm text-destructive">{errors.sku.message}</p>
            )}
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
            <Label htmlFor="category_id">Category *</Label>
            <Select
              value={categoryValue ?? ''}
              onValueChange={(val) => setValue('category_id', val)}
            >
              <SelectTrigger id="category_id">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive">
                {errors.category_id.message}
              </p>
            )}
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
              <p className="text-sm text-destructive">{errors.reorder_threshold.message}</p>
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

          {/* Initial Stock Section */}
          <div className="border-t pt-4 mt-2">
            <h3 className="font-semibold text-sm mb-3">Initial Stock (Optional)</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location_id">Location</Label>
              <Select
                value={locationValue ?? ''}
                onValueChange={(val) => setValue('location_id', val)}
              >
                <SelectTrigger id="location_id">
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {locationValue && (
              <div className="flex flex-col gap-1.5 mt-3">
                <Label htmlFor="initial_quantity">Quantity</Label>
                <Input
                  id="initial_quantity"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register('initial_quantity')}
                />
                {errors.initial_quantity && (
                  <p className="text-sm text-destructive">{errors.initial_quantity.message}</p>
                )}
              </div>
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
            <Button type="submit" disabled={isSubmitting || createItem.isPending || createTransaction.isPending}>
              Create Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
