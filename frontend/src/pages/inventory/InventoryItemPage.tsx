import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useItem, useDeleteItem, useStockLevels } from '@/hooks/useInventory'
import { EditItemForm } from './EditItemForm'
import { StockLevelTable } from './StockLevelTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'

export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { roles, permissions } = useAuth()
  const [isEditMode, setIsEditMode] = useState(false)

  const isAdmin = roles.some((r) => r.name === 'admin')
  const canEdit = permissions.includes('inventory:write')

  const { data: item, isLoading, error } = useItem(id!)
  const { data: stockLevels, isLoading: isLoadingStock } = useStockLevels(id!, {
    enabled: !!id,
  })

  const deleteItem = useDeleteItem()

  if (!id) return <PageError message="Item ID not found" />

  if (isLoading) return <LoadingSpinner />

  if (error || !item) {
    return (
      <PageError
        message="Failed to load item"
        onRetry={() => window.location.reload()}
      />
    )
  }

  async function handleDelete() {
    if (!item) return
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      navigate('/inventory')
    } catch {
      // error handled by mutation error state
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inventory')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground mt-1">SKU: {item.sku}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {isEditMode ? 'Cancel Edit' : 'Edit'}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {isEditMode && canEdit ? (
        <div className="border rounded-lg p-6 bg-accent/30">
          <h2 className="text-lg font-semibold mb-4">Edit Item</h2>
          <EditItemForm
            open={isEditMode}
            onOpenChange={setIsEditMode}
            itemId={item.id}
            item={item}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Unit</dt>
                  <dd className="font-medium">{item.unit}</dd>
                </div>
                {item.description && (
                  <div>
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="font-medium">{item.description}</dd>
                  </div>
                )}
                {item.reorder_threshold > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Reorder Threshold</dt>
                    <dd className="font-medium">{item.reorder_threshold}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Bookable</dt>
                  <dd className="font-medium">
                    {item.is_bookable ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Metadata</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Created At</dt>
                  <dd className="font-medium">
                    {new Date(item.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated At</dt>
                  <dd className="font-medium">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="font-medium">{item.version}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Stock Levels</h3>
            {isLoadingStock ? (
              <LoadingSpinner />
            ) : stockLevels ? (
              <StockLevelTable stockLevels={stockLevels} />
            ) : (
              <p className="text-muted-foreground text-sm">No stock levels found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
