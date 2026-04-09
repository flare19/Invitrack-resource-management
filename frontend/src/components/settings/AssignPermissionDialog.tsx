import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Permission } from '@/types/users'

type AssignPermissionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: number
  roleName: string
  availablePermissions: Permission[]
  assignedPermissionIds: number[]
  isLoading: boolean
  onSubmit: (permissionId: number) => Promise<void>
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
  if (status === 409) return 'This permission is already assigned to the role.'
  if (status === 422) return 'Invalid permission selection.'
  if (status === 404) return 'Role or permission not found.'
  return 'Something went wrong. Please try again.'
}

export default function AssignPermissionDialog({
  open,
  onOpenChange,
  roleName,
  availablePermissions,
  assignedPermissionIds,
  isLoading,
  onSubmit,
  error,
}: AssignPermissionDialogProps) {
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedPermissionId('')
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    if (!selectedPermissionId) return

    try {
      await onSubmit(Number(selectedPermissionId))
      setSelectedPermissionId('')
    } catch {
      // Error handled by error prop
    }
  }

  // Filter out already assigned permissions
  const availablePermissionsToSelect = availablePermissions.filter(
    perm => !assignedPermissionIds.includes(perm.id)
  )

  const serverError = getErrorMessage(error)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Permission to {roleName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Select a permission</label>
            {availablePermissionsToSelect.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All permissions are already assigned to this role.
              </p>
            ) : (
              <Select value={selectedPermissionId} onValueChange={setSelectedPermissionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a permission" />
                </SelectTrigger>
                <SelectContent>
                  {availablePermissionsToSelect.map(perm => (
                    <SelectItem key={perm.id} value={String(perm.id)}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{perm.code}</span>
                        <span className="text-xs text-muted-foreground">
                          {perm.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              type="button"
              disabled={
                isLoading ||
                !selectedPermissionId ||
                availablePermissionsToSelect.length === 0
              }
              onClick={handleSubmit}
            >
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
