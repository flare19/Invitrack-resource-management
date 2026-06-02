import { auditQueue } from '../modules/audit/audit.queue';
import { getAuditWorker } from '../modules/audit/audit.worker';

export default async function globalTeardown() {
  const worker = getAuditWorker();
  if (worker) await worker.close();
  await auditQueue.close();
}