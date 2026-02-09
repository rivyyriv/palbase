import { config } from './config';
import { RescueGroupsFetcher } from './scrapers/rescuegroups';
import {
  createScrapeLog,
  updateScrapeLog,
  bulkUpsertPets,
  upsertShelter,
  markStalePetsAsRemoved,
  createScrapeError,
} from './db';
import type { ScrapeSource } from '@palbase/shared';

export interface SyncResult {
  petsFound: number;
  petsAdded: number;
  petsRemoved: number;
  errorCount: number;
  durationMs: number;
}

/**
 * Run a full sync from RescueGroups API to Supabase.
 * Fetches available pets, upserts them, and marks stale ones as removed.
 */
export async function runSync(triggeredBy: string): Promise<SyncResult> {
  const source: ScrapeSource = 'rescuegroups';
  console.log(`Starting sync, triggered by ${triggeredBy}`);

  // Create sync log entry
  const syncLog = await createScrapeLog({
    source,
    status: 'running',
    triggered_by: triggeredBy,
  });

  if (!syncLog) {
    throw new Error('Failed to create sync log');
  }

  const startTime = Date.now();
  await updateScrapeLog(syncLog.id, {
    started_at: new Date().toISOString(),
  });

  let petsFound = 0;
  let petsAdded = 0;
  let petsRemoved = 0;
  let errorCount = 0;

  const fetcher = new RescueGroupsFetcher();

  try {
    await fetcher.initialize();

    // Fetch pets from RescueGroups API
    const result = await fetcher.scrape();

    petsFound = result.pets.length;
    console.log(`Fetched ${petsFound} pets from RescueGroups`);

    // Upsert shelters
    const shelterIdMap = new Map<string, string>();
    for (const shelter of result.shelters) {
      const upserted = await upsertShelter(shelter);
      if (upserted && shelter.source_id) {
        shelterIdMap.set(shelter.source_id, upserted.id);
      }
    }

    // Prepare pets with source
    const petsToUpsert = result.pets.map(pet => ({
      ...pet,
      source,
      shelter_id: pet.shelter_source_id
        ? shelterIdMap.get(pet.shelter_source_id) || null
        : null,
    }));

    // Bulk upsert in batches of 100
    if (petsToUpsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < petsToUpsert.length; i += batchSize) {
        const batch = petsToUpsert.slice(i, i + batchSize);
        const count = await bulkUpsertPets(batch);
        petsAdded += count;

        if (i % 500 === 0 && i > 0) {
          console.log(`  Upserted ${i}/${petsToUpsert.length} pets...`);
        }
      }
    }

    // Mark stale pets as removed
    petsRemoved = await markStalePetsAsRemoved(source, config.sync.staleHours);
    console.log(`Marked ${petsRemoved} stale pets as removed`);

    // Log any errors from the fetch
    for (const error of result.errors) {
      errorCount++;
      await createScrapeError({
        scrape_log_id: syncLog.id,
        source,
        error_type: error.type,
        error_message: error.message,
        url: error.url,
      });
    }

    // Update log with final stats
    const duration = Date.now() - startTime;
    await updateScrapeLog(syncLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      pets_found: petsFound,
      pets_added: petsAdded,
      pets_updated: 0,
      pets_removed: petsRemoved,
      error_count: errorCount,
      duration_ms: duration,
    });

    console.log(`Sync completed in ${duration}ms: ${petsFound} found, ${petsAdded} upserted, ${petsRemoved} removed`);

    return { petsFound, petsAdded, petsRemoved, errorCount, durationMs: duration };

  } catch (error) {
    console.error('Sync failed:', error);

    const duration = Date.now() - startTime;
    await updateScrapeLog(syncLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_count: 1,
      duration_ms: duration,
    });

    await createScrapeError({
      scrape_log_id: syncLog.id,
      source,
      error_type: 'SYNC_FAILED',
      error_message: error instanceof Error ? error.message : String(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  } finally {
    await fetcher.cleanup();
  }
}
