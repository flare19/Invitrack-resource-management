import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDeleteItem } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { InventoryItem } from '@/types/inventory'

type ItemCardProps = {
  item: InventoryItem
}

export function ItemCard({ item }: ItemCardProps) {
  const { roles } = useAuth()
  const deleteItem = useDeleteItem()

  const isAdmin = roles.some((r) => r.name === 'admin')

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      await deleteItem.mutateAsync(item.id)
    } catch {
      // error handled by mutation error state
    }
  }

  return (
    <Link
      to={`/inventory/${item.id}`}
      className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{item.name}</h3>
            {item.is_bookable && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Bookable
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">SKU: {item.sku}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Unit: {item.unit}</span>
            {item.reorder_threshold > 0 && (
              <span>Reorder threshold: {item.reorder_threshold}</span>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={deleteItem.isPending}
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Link>
  )
}
