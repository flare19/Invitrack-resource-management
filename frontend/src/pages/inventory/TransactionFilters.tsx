import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import type { GetTransactionsParams } from '@/api/inventory'
import type { InventoryItem, Location } from '@/types/inventory'

type TransactionFiltersProps = {
  filters: GetTransactionsParams
  onFiltersChange: (filters: GetTransactionsParams) => void
  items: InventoryItem[]
  locations: Location[]
  canViewAll: boolean
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  items,
  locations,
  canViewAll,
}: TransactionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const transactionTypes: Array<{ value: string; label: string }> = [
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'transfer', label: 'Transfer' },
  ]

  function handleFilterChange(key: keyof GetTransactionsParams, value: unknown) {
    const newFilters = { ...filters, [key]: value }
    if (!value) {
      delete newFilters[key]
    }
    onFiltersChange(newFilters)
  }

  function handleClearFilters() {
    onFiltersChange({ page: 1 })
  }

  const hasActiveFilters =
    filters.item_id ||
    filters.location_id ||
    filters.type ||
    filters.from ||
    filters.to

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm font-medium hover:underline w-full text-left text-white"
      >
        {isExpanded ? '▼' : '▶'} Filters
        {hasActiveFilters && (
          <span className="ml-2 inline-block bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
            Active
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item_id">Item</Label>
              <Select
                value={filters.item_id ?? ''}
                onValueChange={(value) =>
                  handleFilterChange('item_id', value || undefined)
                }
              >
                <SelectTrigger id="item_id">
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location_id">Location</Label>
              <Select
                value={filters.location_id ?? ''}
                onValueChange={(value) =>
                  handleFilterChange('location_id', value || undefined)
                }
              >
                <SelectTrigger id="location_id">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select
                value={filters.type ?? ''}
                onValueChange={(value) =>
                  handleFilterChange('type', value || undefined)
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {transactionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canViewAll && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="performed_by">Performed By</Label>
                <Input
                  id="performed_by"
                  placeholder="Filter by user ID"
                  value={filters.performed_by ?? ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'performed_by',
                      e.target.value || undefined
                    )
                  }
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">From Date</Label>
              <Input
                id="from"
                type="date"
                value={filters.from ?? ''}
                onChange={(e) =>
                  handleFilterChange('from', e.target.value || undefined)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">To Date</Label>
              <Input
                id="to"
                type="date"
                value={filters.to ?? ''}
                onChange={(e) =>
                  handleFilterChange('to', e.target.value || undefined)
                }
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
