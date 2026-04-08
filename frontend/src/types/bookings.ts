// ============================================================
// Resource — A bookable resource backed by an inventory item
// ============================================================

export type Resource = {
  id: string
  item_id: string
  name: string
  quantity: number
  is_active: boolean
  created_at: string
}

// ============================================================
// Reservation — A booking request for a resource
// ============================================================

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type Reservation = {
  id: string
  resource_id: string
  requested_by: string
  quantity: number
  start_time: string // ISO8601 UTC
  end_time: string // ISO8601 UTC
  status: ReservationStatus
  priority: number
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Availability — Real-time availability check result
// ============================================================

export type Availability = {
  resource_id: string
  total_quantity: number
  reserved_quantity: number
  available_quantity: number
  start_time: string // ISO8601 UTC
  end_time: string // ISO8601 UTC
}
