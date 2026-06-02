import { Worker } from 'bullmq';
import { env } from '../../config/env';
import { createAuditEvent } from './audit.service';
import { CreateAuditEventInput } from './audit.types';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

export function startAuditWorker(): void {
  const worker = new Worker(
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