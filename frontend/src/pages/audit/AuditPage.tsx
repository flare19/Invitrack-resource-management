import { useState } from 'react'
import { useAuditEvents } from '@/hooks/useAudit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ListAuditEventsParams } from '@/types/audit'

export default function AuditPage() {
  const [filters, setFilters] = useState<ListAuditEventsParams>({
    page: 1,
    per_page: 50,
  })

  const { data, isLoading, isError } = useAuditEvents(filters)

  if (isError) {
    return (
      <PageError
        message="Failed to load audit logs. Please try again."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const events = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1

  function handlePrevious() {
    setFilters(prev => ({
      ...prev,
      page: Math.max(1, (prev.page ?? 1) - 1),
    }))
  }

  function handleNext() {
    setFilters(prev => ({
      ...prev,
      page: Math.min(totalPages, (prev.page ?? 1) + 1),
    }))
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          System activity and changes {meta && `(${meta.total} total events)`}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 flex gap-3">
        <Input
          placeholder="Filter by module..."
          value={filters.module ?? ''}
          onChange={e =>
            setFilters(prev => ({
              ...prev,
              module: e.target.value || undefined,
              page: 1,
            }))
          }
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by action..."
          value={filters.action ?? ''}
          onChange={e =>
            setFilters(prev => ({
              ...prev,
              action: e.target.value || undefined,
              page: 1,
            }))
          }
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by actor email..."
          value={filters.actorId ?? ''}
          onChange={e =>
            setFilters(prev => ({
              ...prev,
              actorId: e.target.value || undefined,
              page: 1,
            }))
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No audit events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    Timestamp
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    Actor
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    Module
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    Target
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-900">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-gray-900">
                      {event.actor_email ? (
                        <div>
                          <p className="font-medium">{event.actor_email}</p>
                          <p className="text-xs text-gray-500">{event.actor_id}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {event.module}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          event.action === 'DELETE'
                            ? 'bg-red-100 text-red-700'
                            : event.action === 'CREATE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {event.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-900">
                      {event.target_type && event.target_id ? (
                        <div>
                          <p className="font-medium">{event.target_type}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {event.target_id}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {event.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {meta?.page} of {totalPages} ({meta?.total} total events)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={!meta || meta.page <= 1}
              className="gap-2 !text-white !border-white disabled:!text-gray-500 disabled:!border-gray-600 disabled:!bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!meta || meta.page >= totalPages}
              className="gap-2 !text-white !border-white disabled:!text-gray-500 disabled:!border-gray-600 disabled:!bg-transparent"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
