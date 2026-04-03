// ============================================================
// Resource DTOs
// ============================================================

export interface ResourceDTO {
  id: string;
  item_id: string;
  name: string;
  quantity: number;
  is_active: boolean;
  created_at: Date;
}

export interface CreateResourceDTO {
  item_id: string;
  name: string;
  quantity: number;
}

export interface UpdateResourceDTO {
  name?: string;
  quantity?: number;
  is_active?: boolean;
}

// ============================================================
// Reservation DTOs
// ============================================================

export interface ReservationDTO {
  id: string;
  resource_id: string;
  requested_by: string;
  quantity: number;
  start_time: Date;
  end_time: Date;
  status: string;
  priority: number;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReservationDTO {
  resource_id: string;
  quantity: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface UpdateReservationDTO {
  notes?: string;
  status?: string;
  quantity?: number;
  start_time?: string;
  end_time?: string;
}

export interface ReviewReservationDTO {
  action: 'approve' | 'reject';
  notes?: string;
}

// ============================================================
// Availability DTO
// ============================================================

export interface AvailabilityDTO {
  resource_id: string;
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  start_time: Date;
  end_time: Date;
}