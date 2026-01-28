import cron from 'node-cron';
import { config } from './config';
import { addAllScrapeJobs } from './jobs/queue';

let scheduledTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  if (scheduledTask) {
    console.warn('Scheduler already running');
    return;
  }

  // Validate cron expression
  if (!cron.validate(config.scraper.cronSchedule)) {
    throw new Error(`Invalid cron schedule: ${config.scraper.cronSchedule}`);
  }

  scheduledTask = cron.schedule(config.scraper.cronSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled scrape jobs`);
    
    try {
      await addAllScrapeJobs('cron');
      console.log('All scrape jobs queued successfully');
    } catch (error) {
      console.error('Failed to queue scrape jobs:', error);
    }
  });

  console.log(`Scheduler started with schedule: ${config.scraper.cronSchedule}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Scheduler stopped');
  }
}

export function getNextRunTime(): Date | null {
  if (!scheduledTask) return null;
  
  // Parse cron expression to get next run time
  const [minute, hour, dayOfMonth, month, dayOfWeek] = config.scraper.cronSchedule.split(' ');
  const now = new Date();
  
  // Simple calculation for daily cron at specific hour
  if (minute !== '*' && hour !== '*') {
    const nextRun = new Date(now);
    nextRun.setHours(parseInt(hour, 10));
    nextRun.setMinutes(parseInt(minute, 10));
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }
  
  return null;
}
