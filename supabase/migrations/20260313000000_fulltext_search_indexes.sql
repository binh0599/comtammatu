-- Full-text search indexes using pg_trgm for fuzzy/partial matching
-- These complement existing tsvector FTS indexes with trigram-based search

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Customer search (CRM module)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email_trgm ON customers USING GIN (email gin_trgm_ops);

-- Menu item search (POS + admin)
CREATE INDEX IF NOT EXISTS idx_menu_items_name_trgm ON menu_items USING GIN (name gin_trgm_ops);

-- Ingredient search (Inventory module)
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING GIN (name gin_trgm_ops);

-- Profile name search (employees use profile_id -> profiles.full_name)
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON profiles USING GIN (full_name gin_trgm_ops);
