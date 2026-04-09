import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Resource } from '@/types/bookings'

type ResourceCardProps = {
  resource: Resource
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const statusBadge = resource.is_active
    ? { label: 'Active', variant: 'default' as const }
    : { label: 'Inactive', variant: 'secondary' as const }

  const createdDate = new Date(resource.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      to={`/bookings/resources/${resource.id}`}
      className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold truncate">{resource.name}</h3>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Quantity: {resource.quantity} units
          </p>

          <p className="text-xs text-muted-foreground">
            Created {createdDate}
          </p>
        </div>
      </div>
    </Link>
  )
}
