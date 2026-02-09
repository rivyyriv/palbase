import cron from 'node-cron';
import { config } from './config';
import { runSync } from './sync';

let scheduledTask: cron.ScheduledTask | null = null;
let isSyncing = false;

export function startScheduler(): void {
  if (scheduledTask) {
    console.warn('Scheduler already running');
    return;
  }

  // Validate cron expression
  if (!cron.validate(config.sync.cronSchedule)) {
    throw new Error(`Invalid cron schedule: ${config.sync.cronSchedule}`);
  }

  scheduledTask = cron.schedule(config.sync.cronSchedule, async () => {
    if (isSyncing) {
      console.log('Sync already in progress, skipping scheduled run');
      return;
    }

    console.log(`[${new Date().toISOString()}] Running scheduled sync`);
    isSyncing = true;

    try {
      const result = await runSync('cron');
      console.log('Scheduled sync completed:', result);
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    } finally {
      isSyncing = false;
    }
  });

  console.log(`Scheduler started with schedule: ${config.sync.cronSchedule}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Scheduler stopped');
  }
}
