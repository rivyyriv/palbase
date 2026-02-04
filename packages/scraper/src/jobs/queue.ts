import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import type { ScrapeSource } from '@palbase/shared';
import {
  createScrapeLog,
  updateScrapeLog,
  bulkUpsertPets,
  upsertShelter,
  markStalePetsAsRemoved,
  createScrapeError,
} from '../db';
import { PetfinderScraper } from '../scrapers/petfinder';
import { AdoptAPetScraper } from '../scrapers/adoptapet';
import { ASPCAScraper } from '../scrapers/aspca';
import { BestFriendsScraper } from '../scrapers/bestfriends';
import { PetSmartScraper } from '../scrapers/petsmart';
import type { BaseScraper } from '../scrapers/base';

export interface ScrapeJobData {
  source: ScrapeSource;
  triggeredBy: 'cron' | 'manual' | string;
}

export interface ScrapeJobResult {
  scrapeLogId: string;
  petsFound: number;
  petsAdded: number;
  petsUpdated: number;
  petsRemoved: number;
  errorCount: number;
}

let connection: IORedis | null = null;
let scrapeQueue: Queue<ScrapeJobData, ScrapeJobResult> | null = null;
let scrapeWorker: Worker<ScrapeJobData, ScrapeJobResult> | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const redisUrl = config.redis.url;
    const isUpstash = redisUrl.startsWith('rediss://');
    
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      // Upstash requires TLS
      ...(isUpstash && { tls: { rejectUnauthorized: false } }),
    });
  }
  return connection;
}

export function getScrapeQueue(): Queue<ScrapeJobData, ScrapeJobResult> {
  if (!scrapeQueue) {
    scrapeQueue = new Queue<ScrapeJobData, ScrapeJobResult>('scrape', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 100,
        },
      },
    });
  }
  return scrapeQueue;
}

function getScraperForSource(source: ScrapeSource): BaseScraper {
  switch (source) {
    case 'petfinder':
      return new PetfinderScraper();
    case 'adoptapet':
      return new AdoptAPetScraper();
    case 'aspca':
      return new ASPCAScraper();
    case 'bestfriends':
      return new BestFriendsScraper();
    case 'petsmart':
      return new PetSmartScraper();
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function processScrapeJob(job: Job<ScrapeJobData, ScrapeJobResult>): Promise<ScrapeJobResult> {
  const { source, triggeredBy } = job.data;
  console.log(`Starting scrape job for ${source}, triggered by ${triggeredBy}`);

  // Create scrape log
  const scrapeLog = await createScrapeLog({
    source,
    status: 'running',
    triggered_by: triggeredBy,
  });

  if (!scrapeLog) {
    throw new Error('Failed to create scrape log');
  }

  const startTime = Date.now();
  await updateScrapeLog(scrapeLog.id, {
    started_at: new Date().toISOString(),
  });

  let petsFound = 0;
  let petsAdded = 0;
  let petsUpdated = 0;
  let petsRemoved = 0;
  let errorCount = 0;

  const scraper = getScraperForSource(source);

  try {
    await scraper.initialize();

    // Run the scraper
    const result = await scraper.scrape();

    petsFound = result.pets.length;
    console.log(`Found ${petsFound} pets from ${source}`);

    // Upsert shelters first
    const shelterIdMap = new Map<string, string>();
    for (const shelter of result.shelters) {
      const upserted = await upsertShelter(shelter);
      if (upserted && shelter.source_id) {
        shelterIdMap.set(shelter.source_id, upserted.id);
      }
    }

    // Prepare pets with shelter IDs and source
    const petsToUpsert = result.pets.map(pet => ({
      ...pet,
      source,
      shelter_id: pet.shelter_source_id ? shelterIdMap.get(pet.shelter_source_id) || null : null,
    }));

    // Bulk upsert pets
    if (petsToUpsert.length > 0) {
      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < petsToUpsert.length; i += batchSize) {
        const batch = petsToUpsert.slice(i, i + batchSize);
        const count = await bulkUpsertPets(batch);
        petsAdded += count;
        
        // Update job progress
        const progress = Math.round((i / petsToUpsert.length) * 100);
        await job.updateProgress(progress);
      }
    }

    // Mark stale pets as removed
    petsRemoved = await markStalePetsAsRemoved(source, config.scraper.staleHours);
    console.log(`Marked ${petsRemoved} stale pets as removed`);

    // Log errors
    for (const error of result.errors) {
      errorCount++;
      await createScrapeError({
        scrape_log_id: scrapeLog.id,
        source,
        error_type: error.type,
        error_message: error.message,
        url: error.url,
      });
    }

    // Update scrape log with final stats
    const duration = Date.now() - startTime;
    await updateScrapeLog(scrapeLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      pets_found: petsFound,
      pets_added: petsAdded,
      pets_updated: petsUpdated,
      pets_removed: petsRemoved,
      error_count: errorCount,
      duration_ms: duration,
    });

    console.log(`Scrape job for ${source} completed in ${duration}ms`);

  } catch (error) {
    console.error(`Scrape job for ${source} failed:`, error);

    const duration = Date.now() - startTime;
    await updateScrapeLog(scrapeLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_count: 1,
      duration_ms: duration,
    });

    await createScrapeError({
      scrape_log_id: scrapeLog.id,
      source,
      error_type: 'SCRAPE_FAILED',
      error_message: error instanceof Error ? error.message : String(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  } finally {
    await scraper.cleanup();
  }

  return {
    scrapeLogId: scrapeLog.id,
    petsFound,
    petsAdded,
    petsUpdated,
    petsRemoved,
    errorCount,
  };
}

export function startWorker(): void {
  if (scrapeWorker) {
    console.warn('Worker already started');
    return;
  }

  scrapeWorker = new Worker<ScrapeJobData, ScrapeJobResult>(
    'scrape',
    processScrapeJob,
    {
      connection: getConnection(),
      concurrency: 1, // Process one scrape at a time
    }
  );

  scrapeWorker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  scrapeWorker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
  });

  scrapeWorker.on('error', error => {
    console.error('Worker error:', error);
  });

  console.log('Scrape worker started');
}

export async function stopWorker(): Promise<void> {
  if (scrapeWorker) {
    await scrapeWorker.close();
    scrapeWorker = null;
  }
  if (scrapeQueue) {
    await scrapeQueue.close();
    scrapeQueue = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}

export async function addScrapeJob(
  source: ScrapeSource,
  triggeredBy: 'cron' | 'manual' | string
): Promise<Job<ScrapeJobData, ScrapeJobResult>> {
  const queue = getScrapeQueue();
  return queue.add(`scrape-${source}`, { source, triggeredBy }, {
    jobId: `${source}-${Date.now()}`,
  });
}

export async function addAllScrapeJobs(
  triggeredBy: 'cron' | 'manual' | string
): Promise<void> {
  const sources: ScrapeSource[] = ['petfinder', 'adoptapet', 'aspca', 'bestfriends', 'petsmart'];
  
  for (const source of sources) {
    await addScrapeJob(source, triggeredBy);
  }
}
