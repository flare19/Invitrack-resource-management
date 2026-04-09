export interface AuditEvent {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: string
  module: string
  target_type: string | null
  target_id: string | null
  payload: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface PaginatedAuditEvents {
  data: AuditEvent[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}

export interface ListAuditEventsParams {
  actorId?: string | undefined
  module?: string | undefined
  action?: string | undefined
  targetType?: string | undefined
  targetId?: string | undefined
  from?: string | undefined
  to?: string | undefined
  page?: number
  per_page?: number
}
