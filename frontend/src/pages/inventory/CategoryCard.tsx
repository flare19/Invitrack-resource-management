import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Category } from '@/types/inventory'

type CategoryCardProps = {
  category: Category
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

export function CategoryCard({
  category,
  onDelete,
  isDeleting,
}: CategoryCardProps) {
  const { permissions } = useAuth()
  const canDelete = permissions.includes('inventory:write')

  async function handleDelete() {
    if (!confirm(`Delete category "${category.name}"? This cannot be undone.`))
      return
    onDelete?.(category.id)
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">{category.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Created {new Date(category.created_at).toLocaleDateString()}
          </p>
        </div>

        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
