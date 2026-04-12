import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { GetReservationsParams } from '@/api/bookings'

type ReservationFiltersProps = {
  values: GetReservationsParams
  onChange: (next: GetReservationsParams) => void
  showUserFilter?: boolean
}

export function ReservationFilters({
  values,
  onChange,
  showUserFilter = false,
}: ReservationFiltersProps) {
  const [fromDate, setFromDate] = useState(values.from ?? '')
  const [toDate, setToDate] = useState(values.to ?? '')
  const [requestedBy, setRequestedBy] = useState(values.requested_by ?? '')

  function handleStatusChange(value: string) {
    onChange({
      ...values,
      ...(value !== 'all' && { status: value }),
      page: 1,
    })
  }

  function handleFromDateChange(value: string) {
    setFromDate(value)
    onChange({
      ...values,
      ...(value && { from: value }),
      page: 1,
    })
  }

  function handleToDateChange(value: string) {
    setToDate(value)
    onChange({
      ...values,
      ...(value && { to: value }),
      page: 1,
    })
  }

  function handleRequestedByChange(value: string) {
    setRequestedBy(value)
    onChange({
      ...values,
      ...(value && { requested_by: value }),
      page: 1,
    })
  }

  function handleClearFilters() {
    setFromDate('')
    setToDate('')
    setRequestedBy('')
    onChange({
      page: 1,
      ...(values.per_page !== undefined && { per_page: values.per_page }),
    })
  }

  const hasFilters = values.status || values.from || values.to || values.requested_by

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select
          value={values.status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger id="status" className="w-40 text-white data-[placeholder]:text-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from-date">From</Label>
        <Input
          id="from-date"
          type="date"
          value={fromDate}
          onChange={(e) => handleFromDateChange(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to-date">To</Label>
        <Input
          id="to-date"
          type="date"
          value={toDate}
          onChange={(e) => handleToDateChange(e.target.value)}
          className="w-40"
        />
      </div>

      {showUserFilter && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requested-by">Requested By</Label>
          <Input
            id="requested-by"
            type="text"
            placeholder="User ID or email"
            value={requestedBy}
            onChange={(e) => handleRequestedByChange(e.target.value)}
            className="w-48"
          />
        </div>
      )}

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
