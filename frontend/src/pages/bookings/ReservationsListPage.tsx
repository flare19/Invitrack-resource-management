import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useReservations } from '@/hooks/useBookings'
import { CreateReservationModal } from '@/components/bookings/CreateReservationModal'
import { ReservationFilters } from '@/components/bookings/ReservationFilters'
import { ReservationCard } from '@/components/bookings/ReservationCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { GetReservationsParams } from '@/api/bookings'

export default function ReservationsListPage() {
  const { permissions, roles } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState<GetReservationsParams>({
    page: 1,
    per_page: 20,
  })

  const canCreate = true // anyone can create their own reservation
  const canApprove = permissions.includes('bookings:approve')

  const { data, isLoading, error } = useReservations(filters)

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load reservations"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const reservations = data?.data ?? []
  const meta = data?.meta

  function handleFilterChange(next: GetReservationsParams) {
    setFilters(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reservations</h1>
        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        )}
      </div>

      <ReservationFilters
        values={filters}
        onChange={handleFilterChange}
        showUserFilter={canApprove}
      />

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No reservations found.</p>
          </div>
        ) : (
          reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              showActions={false}
            />
          ))
        )}
      </div>

      {meta && meta.total > meta.per_page && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {reservations.length} of {meta.total} reservations
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

      <CreateReservationModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  )
}
