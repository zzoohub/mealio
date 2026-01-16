-- =============================================================================
-- MEALIO DATABASE SCHEMA
-- PostgreSQL DDL
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- =============================================================================
-- USER MANAGEMENT
-- =============================================================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    photo_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_created_at_idx ON users(created_at);

COMMENT ON TABLE users IS 'User accounts (login required, guest data stored locally on device)';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp';

-- -----------------------------------------------------------------------------

CREATE TABLE user_auth_providers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auth_provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_auth_providers_provider_unique UNIQUE (auth_provider, provider_user_id),
    CONSTRAINT user_auth_providers_user_provider_unique UNIQUE (user_id, auth_provider),
    CONSTRAINT user_auth_providers_provider_check CHECK (auth_provider IN ('google', 'apple'))
);

CREATE INDEX user_auth_providers_user_id_idx ON user_auth_providers(user_id);

COMMENT ON TABLE user_auth_providers IS 'OAuth providers linked to user accounts (supports account linking)';
COMMENT ON COLUMN user_auth_providers.auth_provider IS 'OAuth provider: google or apple';

-- -----------------------------------------------------------------------------

CREATE TABLE user_settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Display settings
    theme VARCHAR(10) NOT NULL DEFAULT 'system',
    language VARCHAR(5) NOT NULL DEFAULT 'en',

    -- Notification settings
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Privacy settings
    show_location BOOLEAN NOT NULL DEFAULT TRUE,
    allow_analytics BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_settings_theme_check CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT user_settings_language_check CHECK (language IN ('en', 'ko'))
);

COMMENT ON TABLE user_settings IS 'User preferences and settings (1:1 with users)';

-- -----------------------------------------------------------------------------

CREATE TABLE auth_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auth_tokens_user_id_idx ON auth_tokens(user_id);
CREATE INDEX auth_tokens_token_hash_idx ON auth_tokens(token_hash);
CREATE INDEX auth_tokens_user_active_idx ON auth_tokens(user_id, revoked_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE auth_tokens IS 'JWT refresh tokens for session management';

-- =============================================================================
-- DIARY ENTRIES
-- =============================================================================

CREATE TABLE diary_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Entry metadata
    recorded_at TIMESTAMPTZ NOT NULL,
    notes TEXT NOT NULL DEFAULT '',

    -- Meal classification
    meal_type meal_type NOT NULL,

    -- User feedback
    rating SMALLINT,
    would_eat_again BOOLEAN,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT diary_entries_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX diary_entries_user_id_idx ON diary_entries(user_id);
CREATE INDEX diary_entries_recorded_at_idx ON diary_entries(recorded_at);
CREATE INDEX diary_entries_user_recorded_idx ON diary_entries(user_id, recorded_at DESC);
CREATE INDEX diary_entries_user_meal_type_idx ON diary_entries(user_id, meal_type);
CREATE INDEX diary_entries_active_idx ON diary_entries(user_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE diary_entries IS 'Individual meal diary entries';
COMMENT ON COLUMN diary_entries.recorded_at IS 'When the meal was consumed';
COMMENT ON COLUMN diary_entries.rating IS '1-5 satisfaction rating';
COMMENT ON COLUMN diary_entries.deleted_at IS 'Soft delete timestamp';

-- -----------------------------------------------------------------------------

CREATE TABLE entry_locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL UNIQUE REFERENCES diary_entries(id) ON DELETE CASCADE,

    -- Coordinates (auto-captured via GPS)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Human-readable (reverse geocoded)
    address TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entry_locations_coords_idx ON entry_locations(latitude, longitude);

COMMENT ON TABLE entry_locations IS 'Auto-captured location data for diary entries';

-- =============================================================================
-- PHOTOS & MEDIA
-- =============================================================================

CREATE TABLE entry_photos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,

    -- Photo storage
    photo_uri TEXT NOT NULL,
    thumbnail_uri TEXT,

    -- Metadata
    width INTEGER,
    height INTEGER,
    file_size_bytes INTEGER,
    mime_type VARCHAR(50) DEFAULT 'image/jpeg',

    -- Ordering
    sort_order SMALLINT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entry_photos_entry_id_idx ON entry_photos(entry_id);
CREATE INDEX entry_photos_order_idx ON entry_photos(entry_id, sort_order);

-- Ensure only one primary photo per entry
CREATE UNIQUE INDEX entry_photos_one_primary_idx ON entry_photos(entry_id) WHERE is_primary = TRUE;

COMMENT ON TABLE entry_photos IS 'Photos attached to diary entries (up to 10 per entry)';
COMMENT ON COLUMN entry_photos.photo_uri IS 'S3/CloudStorage URI';
COMMENT ON COLUMN entry_photos.thumbnail_uri IS 'Optimized thumbnail URI';

-- =============================================================================
-- NUTRITION DATA
-- =============================================================================

CREATE TABLE user_nutrition (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL UNIQUE REFERENCES diary_entries(id) ON DELETE CASCADE,

    -- User-editable nutrition (all nullable - only override what user wants)
    calories INTEGER,
    protein DECIMAL(6, 2),
    fat DECIMAL(6, 2),
    sugar DECIMAL(6, 2),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_nutrition IS 'User-entered nutrition (optional override of AI estimates)';

-- =============================================================================
-- AI ANALYSIS
-- =============================================================================

CREATE TABLE ai_analyses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL UNIQUE REFERENCES diary_entries(id) ON DELETE CASCADE,

    -- AI detection results
    detected_meals JSONB NOT NULL DEFAULT '[]',
    detected_ingredients JSONB NOT NULL DEFAULT '[]',
    confidence SMALLINT NOT NULL,
    meal_category meal_type,
    cuisine_type VARCHAR(50),

    -- AI-estimated nutrition
    nutrition JSONB NOT NULL,

    -- AI-generated content
    comment TEXT,

    -- Health insights
    health_score SMALLINT,
    nutrition_balance VARCHAR(100),
    recommendations JSONB DEFAULT '[]',

    -- Processing metadata
    model_version VARCHAR(20) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ai_analyses_confidence_check CHECK (confidence >= 0 AND confidence <= 100),
    CONSTRAINT ai_analyses_health_score_check CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100))
);

CREATE INDEX ai_analyses_entry_id_idx ON ai_analyses(entry_id);
CREATE INDEX ai_analyses_health_score_idx ON ai_analyses(health_score DESC, entry_id) WHERE health_score IS NOT NULL;

COMMENT ON TABLE ai_analyses IS 'AI analysis results - immutable AI output (1:1 with diary_entries)';
COMMENT ON COLUMN ai_analyses.detected_meals IS 'Array of detected food items';
COMMENT ON COLUMN ai_analyses.detected_ingredients IS 'Array of detected ingredients';
COMMENT ON COLUMN ai_analyses.nutrition IS 'AI-estimated nutrition: {calories, protein, carbs, fat, ...}';
COMMENT ON COLUMN ai_analyses.confidence IS '0-100 confidence score';
COMMENT ON COLUMN ai_analyses.comment IS 'AI-generated witty comment about the meal';
COMMENT ON COLUMN ai_analyses.health_score IS '0-100 health score';
COMMENT ON COLUMN ai_analyses.nutrition_balance IS 'e.g., "High protein, low carbs"';
COMMENT ON COLUMN ai_analyses.recommendations IS 'Array of {type, message} recommendations';

-- =============================================================================
-- USER INGREDIENTS
-- =============================================================================

CREATE TABLE ingredients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ko VARCHAR(100),

    -- Categorization
    category VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ingredients_name_idx ON ingredients(name);
CREATE INDEX ingredients_name_ko_idx ON ingredients(name_ko) WHERE name_ko IS NOT NULL;
CREATE INDEX ingredients_category_idx ON ingredients(category) WHERE category IS NOT NULL;

-- Trigram index for fuzzy search
CREATE INDEX ingredients_name_trgm_idx ON ingredients USING GIN (name gin_trgm_ops);
CREATE INDEX ingredients_name_ko_trgm_idx ON ingredients USING GIN (name_ko gin_trgm_ops) WHERE name_ko IS NOT NULL;

COMMENT ON TABLE ingredients IS 'Master list of ingredients';
COMMENT ON COLUMN ingredients.name_ko IS 'Korean translation';

-- -----------------------------------------------------------------------------

CREATE TABLE user_ingredients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_ingredients_unique UNIQUE (entry_id, ingredient_id)
);

CREATE INDEX user_ingredients_entry_id_idx ON user_ingredients(entry_id);
CREATE INDEX user_ingredients_ingredient_id_idx ON user_ingredients(ingredient_id);

COMMENT ON TABLE user_ingredients IS 'User-added ingredients (optional override of AI detected ingredients)';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER diary_entries_updated_at
    BEFORE UPDATE ON diary_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_nutrition_updated_at
    BEFORE UPDATE ON user_nutrition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER entry_photos_updated_at
    BEFORE UPDATE ON entry_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUTO-CREATE USER SETTINGS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_settings
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_settings();
