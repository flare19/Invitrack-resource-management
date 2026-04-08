import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCategories } from '@/hooks/useInventory'
import { CreateCategoryModal } from './CreateCategoryModal'
import { CategoryCard } from './CategoryCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CategoriesPage() {
  const { permissions } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const canCreate = permissions.includes('inventory:write')

  const { data: categories, isLoading, error } = useCategories()

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load categories"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const categoryList = categories ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      {categoryList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No categories yet.</p>
          {canCreate && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Category" to create one.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {categoryList.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}

      {canCreate && (
        <CreateCategoryModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      )}
    </div>
  )
}
