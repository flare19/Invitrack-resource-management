import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listAuditEvents, getAuditEvent } from '@/api/audit'
import type { PaginatedAuditEvents, AuditEvent, ListAuditEventsParams } from '@/types/audit'

export const auditKeys = {
  all: ['audit'] as const,
  events: () => [...auditKeys.all, 'events'] as const,
  eventsList: (params: ListAuditEventsParams) => [...auditKeys.events(), params] as const,
  event: (id: string) => [...auditKeys.all, 'event', id] as const,
}

export function useAuditEvents(
  params: ListAuditEventsParams = {},
  options?: Omit<UseQueryOptions<PaginatedAuditEvents>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: auditKeys.eventsList(params),
    queryFn: () => listAuditEvents(params),
    ...options,
  })
}

export function useAuditEvent(
  id: string,
  options?: Omit<UseQueryOptions<AuditEvent>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: auditKeys.event(id),
    queryFn: () => getAuditEvent(id),
    ...options,
  })
}
