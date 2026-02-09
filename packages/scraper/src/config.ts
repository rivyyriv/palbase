import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // RescueGroups.org API (primary data source)
  rescueGroups: {
    apiKey: process.env.RESCUEGROUPS_API_KEY || '',
  },

  // Sync settings
  sync: {
    // Cron schedule: Default 3 AM daily
    cronSchedule: process.env.SYNC_CRON_SCHEDULE || '0 3 * * *',

    // Mark pets as removed if not seen for this many hours
    staleHours: parseInt(process.env.SYNC_STALE_HOURS || '48', 10),
  },

  // Server - Railway provides PORT env var
  port: parseInt(process.env.PORT || process.env.SYNC_PORT || '4000', 10),
};

export function validateConfig(): void {
  const required = [
    ['SUPABASE_URL', config.supabase.url],
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
    ['RESCUEGROUPS_API_KEY', config.rescueGroups.apiKey],
  ];

  const missing = required.filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(([name]) => name).join(', ')}`
    );
  }
}
