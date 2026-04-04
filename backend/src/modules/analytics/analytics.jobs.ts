// src/modules/analytics/analytics.jobs.ts

import cron from 'node-cron';
import { runInventorySnapshotJob, runBookingMetricsJob } from './analytics.service';

function getYesterday(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function startAnalyticsJobs(): void {
  // Runs daily at UTC midnight
  cron.schedule('0 0 * * *', async () => {
    const yesterday = getYesterday();
    console.log(`[analytics] Running daily jobs for ${yesterday.toISOString().split('T')[0]}`);

    try {
      await runInventorySnapshotJob(yesterday);
    } catch (err) {
      console.error('[analytics] Inventory snapshot job failed:', err);
    }

    try {
      await runBookingMetricsJob(yesterday);
    } catch (err) {
      console.error('[analytics] Booking metrics job failed:', err);
    }
  });

  console.log('[analytics] Daily analytics jobs scheduled at UTC midnight.');
}