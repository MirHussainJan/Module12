CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  first_name VARCHAR(50) NOT NULL DEFAULT 'User',
  last_name VARCHAR(50) NOT NULL DEFAULT 'Unknown',
  display_name VARCHAR(100) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  average_rating NUMERIC(2,1) DEFAULT 5.0
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS rental_asset_categories (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  parent_id INTEGER REFERENCES rental_asset_categories(id) ON DELETE SET NULL,
  category_name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental_assets (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_name VARCHAR(200) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES rental_asset_categories(id),
  description TEXT NOT NULL,
  condition VARCHAR(20) NOT NULL,
  daily_rate DECIMAL(18,4) NOT NULL CHECK (daily_rate > 0),
  security_deposit DECIMAL(18,4) NOT NULL CHECK (security_deposit >= 0),
  pickup_location VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  images JSONB,
  status VARCHAR(20) DEFAULT 'available',
  requires_advance_booking BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_images (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES rental_assets(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  upload_order INTEGER NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_specifications (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES rental_assets(id) ON DELETE CASCADE,
  spec_key VARCHAR(100) NOT NULL,
  spec_value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS rental_bookings (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  asset_id INTEGER NOT NULL REFERENCES rental_assets(id) ON DELETE CASCADE,
  renter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_days INTEGER NOT NULL,
  daily_rate DECIMAL(18,4) NOT NULL,
  total_rental_amount DECIMAL(18,4) NOT NULL,
  security_deposit DECIMAL(18,4) NOT NULL,
  total_amount DECIMAL(18,4) NOT NULL,
  escrow_transaction_id VARCHAR(100) UNIQUE,
  booking_status booking_status DEFAULT 'pending',
  pickup_verified_at TIMESTAMP,
  pickup_verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  return_verified_at TIMESTAMP,
  return_verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS rental_handover_records (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  handover_type VARCHAR(20) NOT NULL,
  verification_method VARCHAR(20) NOT NULL,
  qr_code_data VARCHAR(500) UNIQUE,
  otp_code VARCHAR(6),
  otp_expires_at TIMESTAMP,
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verification_status VARCHAR(20) DEFAULT 'pending',
  failed_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS condition_photos (
  id SERIAL PRIMARY KEY,
  handover_id INTEGER NOT NULL REFERENCES rental_handover_records(id) ON DELETE CASCADE,
  photo_type VARCHAR(30) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rental_assets_owner ON rental_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_assets_status ON rental_assets(status);
CREATE INDEX IF NOT EXISTS idx_rental_assets_city ON rental_assets(city);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_asset_dates ON rental_bookings(asset_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(booking_status);

INSERT INTO users (id, first_name, last_name) VALUES
  (777, 'Renter', 'Demo'),
  (999, 'Owner', 'Demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, average_rating) VALUES
  (999, 4.8)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO rental_asset_categories (category_name, slug, description) VALUES
  ('Photography', 'photography', 'Cameras and lenses'),
  ('Videography', 'videography', 'Video production equipment'),
  ('Audio', 'audio', 'Audio recorders and microphones'),
  ('Computing', 'computing', 'Laptops and computing devices'),
  ('Design', 'design', 'Design and creative equipment'),
  ('Other', 'other', 'Other rental assets')
ON CONFLICT (category_name) DO NOTHING;
