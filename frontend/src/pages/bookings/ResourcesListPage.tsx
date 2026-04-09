import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useResources } from '@/hooks/useBookings'
import { CreateResourceModal } from '@/components/bookings/CreateResourceModal'
import { ResourceFilters } from '@/components/bookings/ResourceFilters'
import { ResourceCard } from '@/components/bookings/ResourceCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { GetResourcesParams } from '@/api/bookings'

export default function ResourcesListPage() {
  const { permissions } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState<GetResourcesParams>({
    page: 1,
    per_page: 20,
  })

  const canCreate = permissions.includes('bookings:write')

  const { data, isLoading, error } = useResources(filters)

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load resources"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const resources = data?.data ?? []
  const meta = data?.meta

  function handleFilterChange(next: GetResourcesParams) {
    setFilters(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Resources</h1>
        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Resource
          </Button>
        )}
      </div>

      <ResourceFilters
        values={filters}
        onChange={handleFilterChange}
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {resources.length === 0 ? (
          <div className="text-center py-12 md:col-span-2 lg:col-span-3">
            <p className="text-muted-foreground">No resources found.</p>
            {canCreate && (
              <p className="text-sm text-muted-foreground mt-2">
                Click "New Resource" to create one.
              </p>
            )}
          </div>
        ) : (
          resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
            />
          ))
        )}
      </div>

      {meta && meta.total > meta.per_page && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {resources.length} of {meta.total} resources
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

      <CreateResourceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  )
}
