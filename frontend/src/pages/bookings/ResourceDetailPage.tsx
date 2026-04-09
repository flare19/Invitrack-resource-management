import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useResource, useReservations } from '@/hooks/useBookings'
import { EditResourceModal } from '@/components/bookings/EditResourceModal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit2 } from 'lucide-react'

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const canEdit = permissions.includes('bookings:write')

  const { data: resource, isLoading, error } = useResource(id!)
  const { data: reservationsData } = useReservations({
    ...(id ? { resource_id: id } : {}),
    per_page: 10,
  })

  if (!id) return <PageError message="Resource ID not found" />

  if (isLoading) return <LoadingSpinner />

  if (error || !resource) {
    return (
      <PageError
        message="Failed to load resource"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const reservations = reservationsData?.data ?? []
  const createdDate = new Date(resource.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusBadge = resource.is_active
    ? { label: 'Active', variant: 'default' as const }
    : { label: 'Inactive', variant: 'secondary' as const }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/bookings/resources')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{resource.name}</h1>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            ID: {resource.id}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Resource Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Item ID</dt>
              <dd className="font-medium text-xs font-mono">{resource.item_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quantity Available</dt>
              <dd className="font-medium">{resource.quantity} units</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {resource.is_active ? 'Active' : 'Inactive'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created At</dt>
              <dd className="font-medium">{createdDate}</dd>
            </div>
          </dl>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Recent Reservations</h3>
          {reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reservations yet.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {reservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex items-center justify-between p-2 border rounded bg-accent/30"
                >
                  <div>
                    <p className="font-medium">
                      {reservation.quantity} units
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {reservation.status}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/bookings/${reservation.id}`)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EditResourceModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        resourceId={resource.id}
        resource={resource}
      />
    </div>
  )
}
