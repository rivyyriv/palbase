-- Palbase Database Schema
-- Pet Adoption Aggregator Platform

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- ENUMS
-- ===========================================

CREATE TYPE pet_species AS ENUM (
  'dog',
  'cat',
  'rabbit',
  'bird',
  'small_animal',
  'horse',
  'reptile',
  'fish',
  'other'
);

CREATE TYPE pet_age AS ENUM (
  'baby',
  'young',
  'adult',
  'senior'
);

CREATE TYPE pet_size AS ENUM (
  'small',
  'medium',
  'large',
  'xlarge'
);

CREATE TYPE pet_gender AS ENUM (
  'male',
  'female',
  'unknown'
);

CREATE TYPE pet_status AS ENUM (
  'active',
  'adopted',
  'removed'
);

CREATE TYPE scrape_source AS ENUM (
  'petfinder',
  'adoptapet',
  'aspca',
  'bestfriends',
  'petsmart'
);

CREATE TYPE scrape_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

-- ===========================================
-- TABLES
-- ===========================================

-- Shelters / Rescue Organizations
CREATE TABLE shelters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source scrape_source NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- Pet Listings
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source scrape_source NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  shelter_id UUID REFERENCES shelters(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  species pet_species NOT NULL,
  breed TEXT,
  breed_secondary TEXT,
  age pet_age,
  size pet_size,
  gender pet_gender DEFAULT 'unknown',
  color TEXT,
  description TEXT,
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  
  -- Location
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  
  -- Shelter info (denormalized for query performance)
  shelter_name TEXT,
  shelter_email TEXT,
  shelter_phone TEXT,
  
  -- Attributes
  good_with_kids BOOLEAN,
  good_with_dogs BOOLEAN,
  good_with_cats BOOLEAN,
  house_trained BOOLEAN,
  spayed_neutered BOOLEAN,
  special_needs BOOLEAN,
  
  -- Adoption
  adoption_fee NUMERIC(10, 2),
  
  -- Status tracking
  status pet_status DEFAULT 'active',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source, source_id)
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's saved/favorited pets
CREATE TABLE saved_pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pet_id)
);

-- Scrape job logs
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source scrape_source NOT NULL,
  status scrape_status DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pets_found INTEGER DEFAULT 0,
  pets_added INTEGER DEFAULT 0,
  pets_updated INTEGER DEFAULT 0,
  pets_removed INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT, -- 'cron' or 'manual' or user_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape errors
CREATE TABLE scrape_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scrape_log_id UUID REFERENCES scrape_logs(id) ON DELETE CASCADE,
  source scrape_source NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  url TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Pets indexes for feed queries
CREATE INDEX idx_pets_species_state_status ON pets(species, location_state, status);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_pets_last_seen ON pets(last_seen_at);
CREATE INDEX idx_pets_source_source_id ON pets(source, source_id);
CREATE INDEX idx_pets_shelter_id ON pets(shelter_id);
CREATE INDEX idx_pets_location_state ON pets(location_state);
CREATE INDEX idx_pets_created_at ON pets(created_at DESC);

-- Full text search on pets
CREATE INDEX idx_pets_name_trgm ON pets USING gin(name gin_trgm_ops);
CREATE INDEX idx_pets_breed_trgm ON pets USING gin(breed gin_trgm_ops);

-- Shelters indexes
CREATE INDEX idx_shelters_source_source_id ON shelters(source, source_id);
CREATE INDEX idx_shelters_state ON shelters(state);

-- Saved pets indexes
CREATE INDEX idx_saved_pets_user_id ON saved_pets(user_id);
CREATE INDEX idx_saved_pets_pet_id ON saved_pets(pet_id);

-- Scrape logs indexes
CREATE INDEX idx_scrape_logs_source ON scrape_logs(source);
CREATE INDEX idx_scrape_logs_status ON scrape_logs(status);
CREATE INDEX idx_scrape_logs_created_at ON scrape_logs(created_at DESC);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at
CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shelters_updated_at
  BEFORE UPDATE ON shelters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_errors ENABLE ROW LEVEL SECURITY;

-- Pets: Public read, service role write
CREATE POLICY "Pets are viewable by everyone"
  ON pets FOR SELECT
  USING (true);

CREATE POLICY "Pets are insertable by service role"
  ON pets FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Pets are updatable by service role"
  ON pets FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Pets are deletable by service role"
  ON pets FOR DELETE
  USING (auth.role() = 'service_role');

-- Shelters: Public read, service role write
CREATE POLICY "Shelters are viewable by everyone"
  ON shelters FOR SELECT
  USING (true);

CREATE POLICY "Shelters are insertable by service role"
  ON shelters FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Shelters are updatable by service role"
  ON shelters FOR UPDATE
  USING (auth.role() = 'service_role');

-- Users: Users can read/update own profile, admins can read all
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM users WHERE id = auth.uid()));

-- Saved pets: Users can manage their own saved pets
CREATE POLICY "Users can view own saved pets"
  ON saved_pets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved pets"
  ON saved_pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved pets"
  ON saved_pets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved pets"
  ON saved_pets FOR UPDATE
  USING (auth.uid() = user_id);

-- Scrape logs: Admins only
CREATE POLICY "Admins can view scrape logs"
  ON scrape_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Service role can manage scrape logs"
  ON scrape_logs FOR ALL
  USING (auth.role() = 'service_role');

-- Scrape errors: Admins only
CREATE POLICY "Admins can view scrape errors"
  ON scrape_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Service role can manage scrape errors"
  ON scrape_errors FOR ALL
  USING (auth.role() = 'service_role');

