import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRoles, usePermissions, useRolePermissions, useAssignPermissionToRole, useRemovePermissionFromRole } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Plus, Trash2 } from 'lucide-react'
import AssignPermissionDialog from '@/components/settings/AssignPermissionDialog'

export default function RolesManagementPage() {
  const { roles: userRoles } = useAuth()
  const isAdmin = userRoles.some(r => r.name === 'admin')

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

  const { data: roles, isLoading: rolesLoading, isError: rolesError, error: rolesErrorObj } = useRoles()
  const { data: allPermissions, isLoading: permsLoading } = usePermissions()
  const { data: rolePermissions, isLoading: rolePermsLoading } = useRolePermissions(selectedRoleId ?? 0, {
    enabled: selectedRoleId !== null,
  })

  const assignPermission = useAssignPermissionToRole(selectedRoleId ?? 0)
  const removePermission = useRemovePermissionFromRole(selectedRoleId ?? 0)

  if (rolesError) {
    return (
      <PageError
        message="Failed to load roles. Please try again."
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (rolesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <PageError
        message="You do not have permission to access this page."
        onRetry={() => window.history.back()}
      />
    )
  }

  const selectedRole = roles?.find(r => r.id === selectedRoleId)
  const assignedPermIds = rolePermissions?.map(p => p.id) ?? []

  async function handleRemovePermission(permissionId: number) {
    if (!confirm('Remove this permission from the role?')) return
    try {
      await removePermission.mutateAsync(permissionId)
    } catch {
      // Error is handled by mutation
    }
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions Management</h1>
        <p className="text-sm text-gray-500 mt-1">Configure permissions for each role</p>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-3 gap-6" style={{ minHeight: '500px' }}>
        {/* Left Panel: Roles List */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Roles</h2>

          {!roles || roles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
              <p className="text-sm text-gray-500">No roles available.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedRoleId === role.id
                      ? 'border-blue-400 bg-blue-900/40'
                      : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  <p className="font-medium text-white">{role.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Priority: {role.priority}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Role Permissions */}
        <div className="col-span-2 rounded-lg border bg-card p-6 space-y-4">
          {selectedRole ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Priority: {selectedRole.priority}</p>
                </div>
                <Button
                  onClick={() => setIsAssignDialogOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Assign Permission
                </Button>
              </div>

              {rolePermsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : !rolePermissions || rolePermissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
                  <p className="text-sm text-gray-500">No permissions assigned.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rolePermissions.map(perm => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between rounded-lg border bg-gray-50 p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{perm.code}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePermission(perm.id)}
                        disabled={removePermission.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Select a role to view and manage permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Permission Dialog */}
      {selectedRole && (
        <AssignPermissionDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          roleId={selectedRole.id}
          roleName={selectedRole.name}
          availablePermissions={allPermissions ?? []}
          assignedPermissionIds={assignedPermIds}
          isLoading={assignPermission.isPending}
          onSubmit={(permissionId: number) =>
            assignPermission.mutateAsync(permissionId).then(() => setIsAssignDialogOpen(false))
          }
          error={assignPermission.error}
        />
      )}
    </div>
  )
}
