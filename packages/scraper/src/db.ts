import { createSupabaseServiceClient, SupabaseClient } from '@palbase/shared';
import { config } from './config';
import type {
  Pet,
  PetInsert,
  Shelter,
  ShelterInsert,
  ScrapeLog,
  ScrapeLogInsert,
  ScrapeLogUpdate,
  ScrapeError,
  ScrapeErrorInsert,
  ScrapeSource,
} from '@palbase/shared';

let supabase: SupabaseClient;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createSupabaseServiceClient({
      url: config.supabase.url,
      serviceRoleKey: config.supabase.serviceRoleKey,
    });
  }
  return supabase;
}

// ===========================================
// Pets
// ===========================================

export async function upsertPet(pet: PetInsert): Promise<Pet | null> {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('pets')
    .upsert(pet, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting pet:', error);
    return null;
  }

  return data;
}

export async function bulkUpsertPets(pets: PetInsert[]): Promise<number> {
  if (pets.length === 0) return 0;
  
  const db = getSupabase();
  
  const { data, error } = await db
    .from('pets')
    .upsert(pets, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    console.error('Error bulk upserting pets:', error);
    return 0;
  }

  return data?.length || 0;
}

export async function updatePetLastSeen(source: ScrapeSource, sourceIds: string[]): Promise<void> {
  if (sourceIds.length === 0) return;
  
  const db = getSupabase();
  
  const { error } = await db
    .from('pets')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('source', source)
    .in('source_id', sourceIds);

  if (error) {
    console.error('Error updating last_seen_at:', error);
  }
}

export async function markStalePetsAsRemoved(source: ScrapeSource, hoursOld: number): Promise<number> {
  const db = getSupabase();
  const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await db
    .from('pets')
    .update({ status: 'removed' })
    .eq('source', source)
    .eq('status', 'active')
    .lt('last_seen_at', cutoffDate)
    .select('id');

  if (error) {
    console.error('Error marking stale pets:', error);
    return 0;
  }

  return data?.length || 0;
}

export async function getPetsBySourceIds(
  source: ScrapeSource,
  sourceIds: string[]
): Promise<Map<string, Pet>> {
  if (sourceIds.length === 0) return new Map();
  
  const db = getSupabase();
  
  const { data, error } = await db
    .from('pets')
    .select('*')
    .eq('source', source)
    .in('source_id', sourceIds);

  if (error) {
    console.error('Error fetching pets by source IDs:', error);
    return new Map();
  }

  return new Map((data || []).map(pet => [pet.source_id, pet]));
}

// ===========================================
// Shelters
// ===========================================

export async function upsertShelter(shelter: ShelterInsert): Promise<Shelter | null> {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('shelters')
    .upsert(shelter, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting shelter:', error);
    return null;
  }

  return data;
}

export async function getShelterBySourceId(
  source: ScrapeSource,
  sourceId: string
): Promise<Shelter | null> {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('shelters')
    .select('*')
    .eq('source', source)
    .eq('source_id', sourceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shelter:', error);
  }

  return data || null;
}

// ===========================================
// Scrape Logs
// ===========================================

export async function createScrapeLog(log: ScrapeLogInsert): Promise<ScrapeLog | null> {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('scrape_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    console.error('Error creating scrape log:', error);
    return null;
  }

  return data;
}

export async function updateScrapeLog(id: string, update: ScrapeLogUpdate): Promise<void> {
  const db = getSupabase();
  
  const { error } = await db
    .from('scrape_logs')
    .update(update)
    .eq('id', id);

  if (error) {
    console.error('Error updating scrape log:', error);
  }
}

export async function getLatestScrapeLog(source: ScrapeSource): Promise<ScrapeLog | null> {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('scrape_logs')
    .select('*')
    .eq('source', source)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching latest scrape log:', error);
  }

  return data || null;
}

// ===========================================
// Scrape Errors
// ===========================================

export async function createScrapeError(error: ScrapeErrorInsert): Promise<void> {
  const db = getSupabase();
  
  const { error: dbError } = await db
    .from('scrape_errors')
    .insert(error);

  if (dbError) {
    console.error('Error creating scrape error:', dbError);
  }
}

export async function bulkCreateScrapeErrors(errors: ScrapeErrorInsert[]): Promise<void> {
  if (errors.length === 0) return;
  
  const db = getSupabase();
  
  const { error: dbError } = await db
    .from('scrape_errors')
    .insert(errors);

  if (dbError) {
    console.error('Error bulk creating scrape errors:', dbError);
  }
}
