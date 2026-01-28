import type { ScrapeSource } from './pet';

export interface Shelter {
  id: string;
  source: ScrapeSource;
  source_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShelterInsert extends Omit<Shelter, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}
