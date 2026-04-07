import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { useUpdateMyProfile } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Pencil, X, Check } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  display_name: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

function getErrorMessage(err: unknown): string {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { status?: number } }).response?.status === 'number'
      ? (err as { response: { status: number } }).response.status
      : 0
  if (status === 422) return 'Validation failed. Please check your inputs.'
  return 'Something went wrong. Please try again.'
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  )
}

export default function MyProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { mutate: updateProfile, isPending } = useUpdateMyProfile()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      display_name: user?.display_name ?? '',
      department: user?.department ?? '',
    },
  })

  if (!user) return <LoadingSpinner />

  function handleEdit() {
    reset({
      full_name: user?.full_name ?? '',
      display_name: user?.display_name ?? '',
      department: user?.department ?? '',
    })
    setSuccessMessage(null)
    setIsEditing(true)
  }

  function handleCancel() {
    reset()
    setIsEditing(false)
  }

  function onSubmit(data: FormData) {
    updateProfile(
      {
        full_name: data.full_name,
        ...(data.display_name ? { display_name: data.display_name } : {}),
        ...(data.department ? { department: data.department } : {}),
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          setSuccessMessage('Profile updated successfully.')
        },
        onError: (err) => {
          setError('root', { message: getErrorMessage(err) })
        },
      }
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        {!isEditing && (
          <Button variant="outline" onClick={handleEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {/* Read-only fields */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Account
        </h2>
        <div className="grid grid-cols-2 gap-5">
          <ProfileField label="Email" value={user.email} />
          <ProfileField
            label="Status"
            value={user.is_verified ? 'Verified' : 'Unverified'}
          />
          <ProfileField
            label="Roles"
            value={
              user.roles.length > 0
                ? user.roles.map((r) => r.name).join(', ')
                : 'No roles assigned'
            }
          />
          <ProfileField
            label="Member since"
            value={new Date(user.created_at).toLocaleDateString()}
          />
        </div>
      </div>

      {/* Editable section */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Profile
        </h2>

        {successMessage && !isEditing && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            {successMessage}
          </p>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <div className="space-y-1">
              <label htmlFor="full_name" className="text-sm font-medium">
                Full name
              </label>
              <input
                id="full_name"
                {...register('full_name')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="display_name" className="text-sm font-medium">
                Display name
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
              </label>
              <input
                id="display_name"
                {...register('display_name')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">
                  {errors.display_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="department" className="text-sm font-medium">
                Department
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
              </label>
              <input
                id="department"
                {...register('department')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.department && (
                <p className="text-xs text-destructive">
                  {errors.department.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? 'Saving...' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            <ProfileField label="Full name" value={user.full_name} />
            <ProfileField label="Display name" value={user.display_name} />
            <ProfileField label="Department" value={user.department} />
          </div>
        )}
      </div>
    </div>
  )
}