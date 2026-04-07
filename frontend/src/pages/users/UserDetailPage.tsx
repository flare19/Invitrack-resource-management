import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useUser, useUpdateUser, useRoles, useAssignRole, useRemoveRole } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { ChevronLeft, Shield, Trash2, Plus } from 'lucide-react'
import EditUserModal from './editUserModal'
import AssignRoleDialog from './assignRoleDialog'

function getErrorMessage(err: unknown): string {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { status?: number } }).response?.status === 'number'
      ? (err as { response: { status: number } }).response.status
      : 0
  if (status === 404) return 'User not found.'
  if (status === 403) return 'You do not have permission to view this user.'
  return 'Something went wrong. Please try again.'
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { roles: currentUserRoles } = useAuth()
  const isAdmin = currentUserRoles.some(r => r.name === 'admin')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false)

  const { data: user, isLoading, isError, error } = useUser(id!)
  const { data: availableRoles } = useRoles()
  const updateUser = useUpdateUser(id!)
  const assignRole = useAssignRole(id!)
  const removeRole = useRemoveRole(id!)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <PageError
        message={getErrorMessage(error)}
        onRetry={() => navigate('/users')}
      />
    )
  }

  if (!user) {
    return (
      <PageError
        message="User not found."
        onRetry={() => navigate('/users')}
      />
    )
  }

  async function handleRemoveRole(roleId: number) {
    if (!confirm('Remove this role?')) return
    try {
      await removeRole.mutateAsync(roleId)
    } catch {
      // Error is handled by mutation error state
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/users')}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>

      {/* User Card - Info Section */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
            {user.display_name && (
              <p className="text-sm text-gray-500 mt-1">@{user.display_name}</p>
            )}
          </div>
          {isAdmin && (
            <Button onClick={() => setIsEditModalOpen(true)} variant="outline">
              Edit Details
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </p>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Department
            </p>
            <p className="text-sm text-gray-900">{user.department ?? '—'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email Verified
            </p>
            <p className="text-sm text-gray-900">
              {user.is_verified ? 'Yes' : 'No'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Member Since
            </p>
            <p className="text-sm text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Updated
            </p>
            <p className="text-sm text-gray-900">
              {new Date(user.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Roles Section */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          {isAdmin && (
            <Button
              onClick={() => setIsAssignRoleDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign Role
            </Button>
          )}
        </div>

        {user.roles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm text-gray-500">No roles assigned.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {user.roles.map(role => (
              <div
                key={role.id}
                className="flex items-center justify-between rounded-lg border bg-gray-50 p-4"
              >
                <div className="flex items-center gap-3">
                  {role.name === 'admin' && (
                    <Shield className="h-4 w-4 text-purple-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">
                      Priority: {role.priority}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(role.id)}
                    disabled={removeRole.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={user}
        isLoading={updateUser.isPending}
        onSubmit={(data: any) => updateUser.mutateAsync(data).then(() => setIsEditModalOpen(false))}
        error={updateUser.error}
      />

      <AssignRoleDialog
        open={isAssignRoleDialogOpen}
        onOpenChange={setIsAssignRoleDialogOpen}
        availableRoles={availableRoles ?? []}
        assignedRoleIds={user.roles.map(r => r.id)}
        isLoading={assignRole.isPending}
        onSubmit={(roleId: number) => assignRole.mutateAsync(roleId).then(() => setIsAssignRoleDialogOpen(false))}
        error={assignRole.error}
      />
    </div>
  )
}
