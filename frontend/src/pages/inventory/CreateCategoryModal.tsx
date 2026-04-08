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
import { useCreateCategory } from '@/hooks/useInventory'
import type { CreateCategoryBody } from '@/api/inventory'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  parent_id: z.string().optional(),
})

type CreateCategoryFormValues = z.infer<typeof createCategorySchema>

type CreateCategoryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCategoryModal({
  open,
  onOpenChange,
}: CreateCategoryModalProps) {
  const createCategory = useCreateCategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      parent_id: undefined,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function onSubmit(values: CreateCategoryFormValues) {
    const body: CreateCategoryBody = {
      name: values.name,
      ...(values.parent_id && { parent_id: values.parent_id }),
    }

    try {
      await createCategory.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // error handled below via createCategory.error
    }
  }

  function getErrorMessage(): string | null {
    if (!createCategory.error) return null
    const err = createCategory.error as {
      response?: { status: number; data?: { error?: { message?: string } } }
    }
    if (err.response?.status === 409) return 'A category with this name already exists.'
    if (err.response?.status === 422) return 'Please check the form for invalid values.'
    return 'Something went wrong. Please try again.'
  }

  const serverError = getErrorMessage()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Category Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              disabled={isSubmitting || createCategory.isPending}
            >
              Create Category
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
