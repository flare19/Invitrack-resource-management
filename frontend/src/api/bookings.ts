import api from '@/api/axios'
import type { PaginatedResponse } from '@/types/common'
import type { Resource, Reservation, Availability } from '@/types/bookings'

// ============================================================
// Resources
// ============================================================

export type GetResourcesParams = {
  page?: number
  per_page?: number
  is_active?: boolean
}

export type CreateResourceBody = {
  item_id: string
  name: string
  quantity: number
}

export type UpdateResourceBody = {
  name?: string
  quantity?: number
  is_active?: boolean
}

export async function getResources(
  params: GetResourcesParams = {}
): Promise<PaginatedResponse<Resource>> {
  const response = await api.get('/bookings/resources', { params })
  return response.data
}

export async function getResource(id: string): Promise<Resource> {
  const response = await api.get(`/bookings/resources/${id}`)
  return response.data
}

export async function createResource(
  body: CreateResourceBody
): Promise<Resource> {
  const response = await api.post('/bookings/resources', body)
  return response.data
}

export async function updateResource(
  id: string,
  body: UpdateResourceBody
): Promise<Resource> {
  const response = await api.patch(`/bookings/resources/${id}`, body)
  return response.data
}

// ============================================================
// Availability
// ============================================================

export async function getAvailability(
  resourceId: string,
  startTime: string,
  endTime: string
): Promise<Availability> {
  const response = await api.get(
    `/bookings/resources/${resourceId}/availability`,
    {
      params: {
        start_time: startTime,
        end_time: endTime,
      },
    }
  )
  return response.data
}

// ============================================================
// Reservations
// ============================================================

export type GetReservationsParams = {
  page?: number
  per_page?: number
  resource_id?: string
  status?: string
  requested_by?: string
  from?: string
  to?: string
}

export type CreateReservationBody = {
  resource_id: string
  quantity: number
  start_time: string
  end_time: string
  notes?: string
}

export type UpdateReservationBody = {
  notes?: string
  status?: string
  quantity?: number
  start_time?: string
  end_time?: string
}

export type ReviewReservationBody = {
  action: 'approve' | 'reject'
  notes?: string
}

export async function getReservations(
  params: GetReservationsParams = {}
): Promise<PaginatedResponse<Reservation>> {
  const response = await api.get('/bookings/reservations', { params })
  return response.data
}

export async function getReservation(id: string): Promise<Reservation> {
  const response = await api.get(`/bookings/reservations/${id}`)
  return response.data
}

export async function createReservation(
  body: CreateReservationBody
): Promise<Reservation> {
  const response = await api.post('/bookings/reservations', body)
  return response.data
}

export async function updateReservation(
  id: string,
  body: UpdateReservationBody
): Promise<Reservation> {
  const response = await api.patch(`/bookings/reservations/${id}`, body)
  return response.data
}

export async function reviewReservation(
  id: string,
  body: ReviewReservationBody
): Promise<Reservation> {
  const response = await api.post(`/bookings/reservations/${id}/review`, body)
  return response.data
}
