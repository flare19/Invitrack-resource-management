import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Location } from '@/types/inventory'

type LocationCardProps = {
  location: Location
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

export function LocationCard({
  location,
  onDelete,
  isDeleting,
}: LocationCardProps) {
  const { permissions } = useAuth()
  const canDelete = permissions.includes('inventory:write')

  async function handleDelete() {
    if (
      !confirm(`Delete location "${location.name}"? This cannot be undone.`)
    )
      return
    onDelete?.(location.id)
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">{location.name}</h3>
          {location.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {location.description}
            </p>
          )}
        </div>

        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-shrink-0 text-destructive hover:text-destructive/80"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
