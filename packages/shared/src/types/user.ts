export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  display_name?: string;
  avatar_url?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
}

export interface SavedPet {
  id: string;
  user_id: string;
  pet_id: string;
  notes: string | null;
  created_at: string;
}

export interface SavedPetInsert {
  pet_id: string;
  notes?: string;
}
