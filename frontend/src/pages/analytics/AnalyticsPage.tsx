// src/pages/analytics/AnalyticsPage.tsx

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useInventorySnapshots, useBookingMetrics } from '@/hooks/useAnalytics'
import { useItems } from '@/hooks/useInventory'
import { useResources } from '@/hooks/useBookings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import type { GetInventorySnapshotsParams, GetBookingMetricsParams } from '@/types/analytics'

type Tab = 'inventory' | 'bookings'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory')

  // --- Inventory tab state ---
  const [inventoryParams, setInventoryParams] = useState<GetInventorySnapshotsParams>({
    item_id: '',
    from: undefined,
    to: undefined,
  })

  // --- Bookings tab state ---
  const [bookingParams, setBookingParams] = useState<GetBookingMetricsParams>({
    resource_id: undefined,
    from: undefined,
    to: undefined,
  })

  // --- Data ---
  const { data: items } = useItems({ per_page: 100 })
  const { data: resources } = useResources({ per_page: 100 })

  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
  } = useInventorySnapshots(inventoryParams)

  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useBookingMetrics(bookingParams)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory Trends
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bookings'
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('bookings')}
        >
          Booking Metrics
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Item</label>
              <select
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={inventoryParams.item_id}
                onChange={e =>
                  setInventoryParams(prev => ({ ...prev, item_id: e.target.value }))
                }
              >
                <option value="">Select an item</option>
                {items?.data.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">From</label>
              <Input
                type="date"
                className="h-9 w-36"
                value={inventoryParams.from ?? ''}
                onChange={e =>
                  setInventoryParams(prev => ({
                    ...prev,
                    ...(e.target.value !== undefined && { from: e.target.value || undefined }),
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">To</label>
              <Input
                type="date"
                className="h-9 w-36"
                value={inventoryParams.to ?? ''}
                onChange={e =>
                  setInventoryParams(prev => ({
                    ...prev,
                    ...(e.target.value !== undefined && { to: e.target.value || undefined }),
                  }))
                }
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setInventoryParams(prev => ({ ...prev, from: undefined, to: undefined }))
              } className="text-white border-white hover:text-gray-200"
            >
              Clear dates
            </Button>
          </div>

          {/* Chart */}
          {!inventoryParams.item_id ? (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Select an item to view stock trends
            </div>
          ) : snapshotsLoading ? (
            <LoadingSpinner />
          ) : snapshotsError ? (
            <PageError
              message="Failed to load inventory snapshots."
              onRetry={() => window.location.reload()}
            />
          ) : !snapshots || snapshots.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              No snapshot data available for this item yet
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="snapshot_date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={val => val.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip labelFormatter={label => `Date: ${label}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Resource</label>
              <select
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={bookingParams.resource_id ?? ''}
                onChange={e =>
                  setBookingParams(prev => ({
                    ...prev,
                    ...(e.target.value !== undefined && {
                      resource_id: e.target.value || undefined,
                    }),
                  }))
                }
              >
                <option value="">All resources</option>
                {resources?.data.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">From</label>
              <Input
                type="date"
                className="h-9 w-36"
                value={bookingParams.from ?? ''}
                onChange={e =>
                  setBookingParams(prev => ({
                    ...prev,
                    ...(e.target.value !== undefined && { from: e.target.value || undefined }),
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">To</label>
              <Input
                type="date"
                className="h-9 w-36"
                value={bookingParams.to ?? ''}
                onChange={e =>
                  setBookingParams(prev => ({
                    ...prev,
                    ...(e.target.value !== undefined && { to: e.target.value || undefined }),
                  }))
                }
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setBookingParams(prev => ({ ...prev, from: undefined, to: undefined }))
              }
            >
              Clear dates
            </Button>
          </div>

          {/* Chart */}
          {metricsLoading ? (
            <LoadingSpinner />
          ) : metricsError ? (
            <PageError
              message="Failed to load booking metrics."
              onRetry={() => window.location.reload()}
            />
          ) : !metrics || metrics.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              No booking metrics available yet
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="metric_date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={val => val.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip labelFormatter={label => `Date: ${label}`} />
                  <Legend />
                  <Bar dataKey="total_requests" name="Total Requests" fill="#2563eb" />
                  <Bar dataKey="approved_count" name="Approved" fill="#16a34a" />
                  <Bar dataKey="rejected_count" name="Rejected" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}