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
import { useCreateItem, useCategories } from '@/hooks/useInventory'
import type { CreateItemBody } from '@/api/inventory'

const createItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  reorder_threshold: z.coerce.number().int().min(0),
  is_bookable: z.boolean(),
})

type CreateItemFormValues = z.infer<typeof createItemSchema>

type CreateItemModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateItemModal({ open, onOpenChange }: CreateItemModalProps) {
  const { data: categories } = useCategories()
  const createItem = useCreateItem()

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
      category_id: 'none',
      reorder_threshold: 0,
      is_bookable: false,
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
      await createItem.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // 409 and 422 error display handled below via createItem.error
    }
  }

  const categoryValue = watch('category_id')
  const isBookable = watch('is_bookable')

  function getErrorMessage(): string | null {
    if (!createItem.error) return null
    const err = createItem.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409) return 'An item with this SKU already exists.'
    if (err.response?.status === 422) return 'Please check the form for invalid values.'
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
            <Button type="submit" disabled={isSubmitting || createItem.isPending}>
              Create Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}