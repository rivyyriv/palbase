import type { Pet, PetFilters, PetWithSaved } from './pet';
import type { ScrapeLog, ScrapeError } from './scrape';
import type { User, SavedPet } from './user';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Pet API
export interface GetPetsParams extends PetFilters {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'name' | 'age';
  sort_order?: 'asc' | 'desc';
}

export type GetPetsResponse = PaginatedResponse<Pet>;
export type GetPetResponse = ApiResponse<PetWithSaved>;

// User API
export type GetUserResponse = ApiResponse<User>;
export type GetSavedPetsResponse = PaginatedResponse<SavedPet & { pet: Pet }>;

// Admin API
export type GetScrapeLogsResponse = PaginatedResponse<ScrapeLog>;
export type GetScrapeErrorsResponse = PaginatedResponse<ScrapeError>;

export interface TriggerScrapeRequest {
  source: string;
}

export interface TriggerScrapeResponse {
  scrape_log_id: string;
  message: string;
}

// Stats
export interface DashboardStats {
  total_pets: number;
  active_pets: number;
  total_shelters: number;
  total_users: number;
  pets_by_species: Record<string, number>;
  pets_by_source: Record<string, number>;
  recent_scrapes: ScrapeLog[];
}
