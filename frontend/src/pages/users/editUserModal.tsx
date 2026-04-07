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
import type { UserProfile, UpdateUserByAdminBody } from '@/types/users'

const editUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  display_name: z.string().optional(),
  department: z.string().optional(),
  is_active: z.boolean(),
})

type EditUserFormValues = z.infer<typeof editUserSchema>

type EditUserModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile
  isLoading: boolean
  onSubmit: (data: UpdateUserByAdminBody) => Promise<void>
  error: unknown
}

function getErrorMessage(err: unknown): string {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { status?: number } }).response?.status === 'number'
      ? (err as { response: { status: number } }).response.status
      : 0
  if (status === 422) return 'Validation failed. Please check your inputs.'
  if (status === 404) return 'User not found.'
  return 'Something went wrong. Please try again.'
}

export default function EditUserModal({
  open,
  onOpenChange,
  user,
  isLoading,
  onSubmit,
  error,
}: EditUserModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: user.full_name,
      display_name: user.display_name ?? '',
      department: user.department ?? '',
      is_active: user.is_active,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFormSubmit(values: EditUserFormValues) {
    const body: UpdateUserByAdminBody = {
      full_name: values.full_name,
      ...(values.display_name && { display_name: values.display_name }),
      ...(values.department && { department: values.department }),
      is_active: values.is_active,
    }

    try {
      await onSubmit(body)
    } catch {
      // Error handled by error prop
    }
  }

  const isActive = watch('is_active')
  const serverError = getErrorMessage(error)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" {...register('display_name')} />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register('department')} />
            {errors.department && (
              <p className="text-sm text-destructive">{errors.department.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked === true)}
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
            <Button type="submit" disabled={isSubmitting || isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
