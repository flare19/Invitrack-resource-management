import api from './axios'
import type { PaginatedAuditEvents, ListAuditEventsParams, AuditEvent } from '@/types/audit'

export async function listAuditEvents(
  params: ListAuditEventsParams = {}
): Promise<PaginatedAuditEvents> {
  const response = await api.get('/audit/events', { params })
  return response.data
}

export async function getAuditEvent(id: string): Promise<AuditEvent> {
  const response = await api.get<AuditEvent>(`/audit/events/${id}`)
  return response.data
}
