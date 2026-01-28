import type { ScrapeSource } from './pet';

export type ScrapeStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScrapeLog {
  id: string;
  source: ScrapeSource;
  status: ScrapeStatus;
  started_at: string | null;
  completed_at: string | null;
  pets_found: number;
  pets_added: number;
  pets_updated: number;
  pets_removed: number;
  error_count: number;
  duration_ms: number | null;
  triggered_by: string | null;
  created_at: string;
}

export interface ScrapeLogInsert {
  source: ScrapeSource;
  status?: ScrapeStatus;
  triggered_by?: string;
}

export interface ScrapeLogUpdate {
  status?: ScrapeStatus;
  started_at?: string;
  completed_at?: string;
  pets_found?: number;
  pets_added?: number;
  pets_updated?: number;
  pets_removed?: number;
  error_count?: number;
  duration_ms?: number;
}

export interface ScrapeError {
  id: string;
  scrape_log_id: string | null;
  source: ScrapeSource;
  error_type: string;
  error_message: string | null;
  url: string | null;
  stack_trace: string | null;
  created_at: string;
}

export interface ScrapeErrorInsert {
  scrape_log_id?: string;
  source: ScrapeSource;
  error_type: string;
  error_message?: string;
  url?: string;
  stack_trace?: string;
}
