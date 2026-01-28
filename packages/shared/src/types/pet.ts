export type PetSpecies =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'bird'
  | 'small_animal'
  | 'horse'
  | 'reptile'
  | 'fish'
  | 'other';

export type PetAge = 'baby' | 'young' | 'adult' | 'senior';

export type PetSize = 'small' | 'medium' | 'large' | 'xlarge';

export type PetGender = 'male' | 'female' | 'unknown';

export type PetStatus = 'active' | 'adopted' | 'removed';

export type ScrapeSource =
  | 'petfinder'
  | 'adoptapet'
  | 'aspca'
  | 'bestfriends'
  | 'petsmart';

export interface Pet {
  id: string;
  source: ScrapeSource;
  source_id: string;
  source_url: string;
  shelter_id: string | null;

  // Basic info
  name: string;
  species: PetSpecies;
  breed: string | null;
  breed_secondary: string | null;
  age: PetAge | null;
  size: PetSize | null;
  gender: PetGender;
  color: string | null;
  description: string | null;

  // Media
  photos: string[];

  // Location
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;

  // Shelter info (denormalized)
  shelter_name: string | null;
  shelter_email: string | null;
  shelter_phone: string | null;

  // Attributes
  good_with_kids: boolean | null;
  good_with_dogs: boolean | null;
  good_with_cats: boolean | null;
  house_trained: boolean | null;
  spayed_neutered: boolean | null;
  special_needs: boolean | null;

  // Adoption
  adoption_fee: number | null;

  // Status
  status: PetStatus;
  first_seen_at: string;
  last_seen_at: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PetInsert extends Omit<Pet, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export interface PetUpdate extends Partial<PetInsert> {
  id: string;
}

export interface PetFilters {
  species?: PetSpecies | PetSpecies[];
  breed?: string;
  age?: PetAge | PetAge[];
  size?: PetSize | PetSize[];
  gender?: PetGender;
  state?: string;
  city?: string;
  zip?: string;
  good_with_kids?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  status?: PetStatus;
  search?: string;
}

export interface PetWithSaved extends Pet {
  is_saved?: boolean;
}
