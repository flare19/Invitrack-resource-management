import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { GetResourcesParams } from '@/api/bookings'

type ResourceFiltersProps = {
  values: GetResourcesParams
  onChange: (next: GetResourcesParams) => void
}

export function ResourceFilters({ values, onChange }: ResourceFiltersProps) {
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({
        ...values,
        ...(searchInput ? { search: searchInput } : {}),
        page: 1,
      })
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  function handleActiveChange(checked: boolean) {
    onChange({
      ...values,
      ...(checked ? { is_active: true } : {}),
      page: 1,
    })
  }

  function handleClearFilters() {
    setSearchInput('')
    onChange({
      page: 1,
      ...(values.per_page !== undefined && { per_page: values.per_page }),
    })
  }

  const hasFilters = searchInput || values.is_active

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Resource name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-56"
        />
      </div>

      <div className="flex items-center gap-2 pb-0.5">
        <Checkbox
          id="is_active"
          checked={values.is_active ?? false}
          onCheckedChange={(checked) =>
            handleActiveChange(checked === true)
          }
        />
        <Label htmlFor="is_active">Active only</Label>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClearFilters}
          className="pb-1"
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
