import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/useInventory'
import type { GetItemsParams } from '@/api/inventory'

type ItemFiltersProps = {
  values: GetItemsParams
  onChange: (next: GetItemsParams) => void
}

export function ItemFilters({ values, onChange }: ItemFiltersProps) {
  const { data: categories } = useCategories()

  const [searchInput, setSearchInput] = useState(values.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleCategoryChange(value: string) {
    onChange({
      ...values,
      ...(value !== 'all' && { category_id: value }),
      page: 1,
    })
  }

  function handleBookableChange(checked: boolean) {
    onChange({
      ...values,
      ...(checked && { is_bookable: true }),
      page: 1,
    })
  }

  function handleLowStockChange(checked: boolean) {
    onChange({
      ...values,
      ...(checked && { low_stock: true }),
      page: 1,
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Name or SKU"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-56"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          value={values.category_id ?? 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="category" className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 pb-0.5">
        <Checkbox
          id="is_bookable"
          checked={values.is_bookable ?? false}
          onCheckedChange={(checked) =>
            handleBookableChange(checked === true)
          }
        />
        <Label htmlFor="is_bookable">Bookable only</Label>
      </div>

      <div className="flex items-center gap-2 pb-0.5">
        <Checkbox
          id="low_stock"
          checked={values.low_stock ?? false}
          onCheckedChange={(checked) =>
            handleLowStockChange(checked === true)
          }
        />
        <Label htmlFor="low_stock">Low stock only</Label>
      </div>
    </div>
  )
}