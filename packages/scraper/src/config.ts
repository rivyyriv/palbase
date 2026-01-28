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

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Scraper settings
  scraper: {
    // Cron schedule: Default 3 AM daily
    cronSchedule: process.env.SCRAPER_CRON_SCHEDULE || '0 3 * * *',
    
    // Rate limiting
    rateLimitMinMs: parseInt(process.env.SCRAPER_RATE_LIMIT_MIN_MS || '2000', 10),
    rateLimitMaxMs: parseInt(process.env.SCRAPER_RATE_LIMIT_MAX_MS || '5000', 10),
    
    // Max concurrent requests per domain
    maxConcurrent: parseInt(process.env.SCRAPER_MAX_CONCURRENT || '2', 10),
    
    // Timeout for page loads (ms)
    pageTimeout: parseInt(process.env.SCRAPER_PAGE_TIMEOUT || '30000', 10),
    
    // Mark pets as removed if not seen for this many hours
    staleHours: parseInt(process.env.SCRAPER_STALE_HOURS || '48', 10),
  },

  // Server
  port: parseInt(process.env.SCRAPER_PORT || '4000', 10),
};

export function validateConfig(): void {
  const required = [
    ['SUPABASE_URL', config.supabase.url],
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
  ];

  const missing = required.filter(([, value]) => !value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(([name]) => name).join(', ')}`
    );
  }
}
