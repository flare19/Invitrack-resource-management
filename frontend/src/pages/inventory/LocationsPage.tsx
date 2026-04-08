import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocations } from '@/hooks/useInventory'
import { CreateLocationModal } from './CreateLocationModal'
import { LocationCard } from './LocationCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function LocationsPage() {
  const { permissions } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const canCreate = permissions.includes('inventory:write')

  const { data: locations, isLoading, error } = useLocations()

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load locations"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const locationList = locations ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Locations</h1>
        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        )}
      </div>

      {locationList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No locations yet.</p>
          {canCreate && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Location" to create one.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {locationList.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}

      {canCreate && (
        <CreateLocationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      )}
    </div>
  )
}
