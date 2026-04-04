// src/modules/audit/service.ts

import { AppError } from '../../errors/AppError';
import { insertAuditEvent, findAuditEvents, findAuditEventById } from './audit.repository';
import { CreateAuditEventInput, ListAuditEventsQuery, AuditEventDTO, PaginatedAuditEvents } from './audit.types';

export async function createAuditEvent(input: CreateAuditEventInput): Promise<void> {
  await insertAuditEvent(input);
}

export async function listAuditEventsService(
  query: ListAuditEventsQuery
): Promise<PaginatedAuditEvents> {
  return findAuditEvents(query);
}

export async function getAuditEventService(id: string): Promise<AuditEventDTO> {
  const event = await findAuditEventById(id);
  if (!event) {
    throw new AppError(404, 'AUDIT_EVENT_NOT_FOUND', `Audit event with id '${id}' does not exist.`);
  }
  return event;
}