import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export interface SupabaseConfig {
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

/**
 * Create a Supabase client for browser/client-side usage
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (!config.url) {
    throw new Error('Supabase URL is required');
  }
  if (!config.anonKey) {
    throw new Error('Supabase anon key is required');
  }
  
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

/**
 * Create a Supabase client with service role key for server-side operations
 */
export function createSupabaseServiceClient(config: SupabaseConfig): SupabaseClient {
  if (!config.url) {
    throw new Error('Supabase URL is required');
  }
  if (!config.serviceRoleKey) {
    throw new Error('Supabase service role key is required');
  }
  
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
