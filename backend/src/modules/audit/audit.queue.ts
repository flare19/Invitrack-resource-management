import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { CreateAuditEventInput } from './audit.types';

const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';
const connection = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || '6379', 10),
};

export const auditQueue = new Queue('audit', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export async function enqueueAuditEvent(input: CreateAuditEventInput): Promise<void> {
  try {
    await auditQueue.add('audit.event', input);
  } catch (err) {
    console.error('[audit:queue] Failed to enqueue audit event:', err);
  }
}