import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useItems } from '@/hooks/useInventory'
import { CreateItemModal } from './CreateItemModal'
import { ItemFilters } from './ItemFilters'
import { ItemCard } from './ItemCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { GetItemsParams } from '@/api/inventory'

export default function InventoryListPage() {
  const { permissions } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState<GetItemsParams>({
    page: 1,
    per_page: 20,
  })

  const canCreate = permissions.includes('inventory:write')

  const { data, isLoading, error } = useItems(filters)

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load inventory items"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const items = data?.data ?? []
  const meta = data?.meta

  function handleFilterChange(next: GetItemsParams) {
    setFilters(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory</h1>
        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      <ItemFilters values={filters} onChange={handleFilterChange} />

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found.</p>
          </div>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      {meta && meta.total > meta.per_page && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {meta.total} items
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, (prev.page ?? 1) - 1),
                }))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) >= Math.ceil(meta.total / meta.per_page)}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: (prev.page ?? 1) + 1,
                }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateItemModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  )
}
