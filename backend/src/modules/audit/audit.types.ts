// src/modules/audit/types.ts

export interface AuditEventDTO {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  module: string;
  target_type: string | null;
  target_id: string | null;
  payload: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateAuditEventInput {
  actorId?: string;
  actorEmail?: string;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListAuditEventsQuery {
  actorId?: string;
  module?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export interface PaginatedAuditEvents {
  data: AuditEventDTO[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}