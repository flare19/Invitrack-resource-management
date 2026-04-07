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
import type { Role } from '@/types/users'

type AssignRoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableRoles: Role[]
  assignedRoleIds: number[]
  isLoading: boolean
  onSubmit: (roleId: number) => Promise<void>
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
  if (status === 409) return 'This role is already assigned to the user.'
  if (status === 422) return 'Invalid role selection.'
  if (status === 404) return 'User or role not found.'
  return 'Something went wrong. Please try again.'
}

export default function AssignRoleDialog({
  open,
  onOpenChange,
  availableRoles,
  assignedRoleIds,
  isLoading,
  onSubmit,
  error,
}: AssignRoleDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedRoleId('')
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    if (!selectedRoleId) return

    try {
      await onSubmit(Number(selectedRoleId))
      setSelectedRoleId('')
    } catch {
      // Error handled by error prop
    }
  }

  // Filter out already assigned roles
  const availableRolesToSelect = availableRoles.filter(
    role => !assignedRoleIds.includes(role.id)
  )

  const serverError = getErrorMessage(error)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Select a role</label>
            {availableRolesToSelect.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All roles are already assigned to this user.
              </p>
            ) : (
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesToSelect.map(role => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      <div className="flex items-center gap-2">
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">
                          (priority: {role.priority})
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
                !selectedRoleId ||
                availableRolesToSelect.length === 0
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
