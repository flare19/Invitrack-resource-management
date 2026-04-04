// src/modules/audit/repository.ts

import prisma from '../../config/prisma';
import { CreateAuditEventInput, ListAuditEventsQuery, AuditEventDTO, PaginatedAuditEvents } from './audit.types';

export async function insertAuditEvent(input: CreateAuditEventInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      ...(input.actorId !== undefined && { actorId: input.actorId }),
      ...(input.actorEmail !== undefined && { actorEmail: input.actorEmail }),
      action: input.action,
      module: input.module,
      ...(input.targetType !== undefined && { targetType: input.targetType }),
      ...(input.targetId !== undefined && { targetId: input.targetId }),
      ...(input.payload !== undefined && { payload: input.payload as object }),
      ...(input.ipAddress !== undefined && { ipAddress: input.ipAddress }),
      ...(input.userAgent !== undefined && { userAgent: input.userAgent }),
    },
  });
}

export async function findAuditEvents(
  query: ListAuditEventsQuery
): Promise<PaginatedAuditEvents> {
  const page = query.page ?? 1;
  const perPage = Math.min(query.perPage ?? 20, 100);
  const skip = (page - 1) * perPage;

  const where = {
    ...(query.actorId !== undefined && { actorId: query.actorId }),
    ...(query.module !== undefined && { module: query.module }),
    ...(query.action !== undefined && { action: query.action }),
    ...(query.targetType !== undefined && { targetType: query.targetType }),
    ...(query.targetId !== undefined && { targetId: query.targetId }),
    ...(query.from !== undefined || query.to !== undefined
      ? {
          createdAt: {
            ...(query.from !== undefined && { gte: new Date(query.from) }),
            ...(query.to !== undefined && { lte: new Date(query.to) }),
          },
        }
      : {}),
  };

  const [events, total] = await prisma.$transaction([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return {
    data: events.map(formatAuditEvent),
    meta: { page, per_page: perPage, total },
  };
}

export async function findAuditEventById(id: string): Promise<AuditEventDTO | null> {
  const event = await prisma.auditEvent.findUnique({ where: { id } });
  if (!event) return null;
  return formatAuditEvent(event);
}

function formatAuditEvent(event: {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  module: string;
  targetType: string | null;
  targetId: string | null;
  payload: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}): AuditEventDTO {
  return {
    id: event.id,
    actor_id: event.actorId,
    actor_email: event.actorEmail,
    action: event.action,
    module: event.module,
    target_type: event.targetType,
    target_id: event.targetId,
    payload: event.payload,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    created_at: event.createdAt,
  };
}