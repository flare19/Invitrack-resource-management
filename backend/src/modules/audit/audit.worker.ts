import { Worker } from 'bullmq';
import { env } from '../../config/env';
import { createAuditEvent } from './audit.service';
import { CreateAuditEventInput } from './audit.types';

const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';
const connection = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || '6379', 10),
};

let worker: Worker;

export function getAuditWorker() {
  return worker;
}

export function startAuditWorker(): void {
  worker = new Worker(
    'audit',
    async (job) => {
      const input = job.data as CreateAuditEventInput;
      await createAuditEvent(input);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[audit:worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[audit:worker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[audit:worker] Worker error:', err);
  });

  console.log('[audit:worker] Worker started');
}