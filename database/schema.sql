-- Mealio Database Schema
-- Pure PostgreSQL DDL for meal logging application
-- Version: 1.0.0
-- Last Updated: 2025-08-28

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";       -- For location data
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- For text search

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,  -- International format e.g., +14155552671
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ  -- Soft delete support
);

-- Create indexes for user lookups
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Phone authentication tracking
CREATE TABLE phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone, expires_at);
CREATE INDEX idx_phone_verifications_created ON phone_verifications(created_at DESC);

-- User sessions for authentication tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 hash of the token
    device_info JSONB,  -- Device type, OS version, app version, etc.
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================================================
-- USER PREFERENCES AND SETTINGS
-- ============================================================================

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'en' CHECK (language IN ('en', 'ko')),
    theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    measurement_units VARCHAR(10) DEFAULT 'metric' CHECK (measurement_units IN ('metric', 'imperial')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Notification settings
CREATE TABLE notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    meal_reminders BOOLEAN DEFAULT true,
    social_notifications BOOLEAN DEFAULT true,
    progress_updates BOOLEAN DEFAULT true,
    ai_insights BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Privacy settings
CREATE TABLE privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(20) DEFAULT 'friends' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    location_sharing BOOLEAN DEFAULT false,
    analytics_collection BOOLEAN DEFAULT true,
    crash_reporting BOOLEAN DEFAULT true,
    data_export_photos BOOLEAN DEFAULT true,
    data_export_analytics BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Goals and targets
CREATE TABLE user_goals (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_calories INT DEFAULT 2000 CHECK (daily_calories > 0),
    protein_percentage INT DEFAULT 25 CHECK (protein_percentage >= 0 AND protein_percentage <= 100),
    carbs_percentage INT DEFAULT 45 CHECK (carbs_percentage >= 0 AND carbs_percentage <= 100),
    fat_percentage INT DEFAULT 30 CHECK (fat_percentage >= 0 AND fat_percentage <= 100),
    meal_frequency INT DEFAULT 3 CHECK (meal_frequency > 0 AND meal_frequency <= 10),
    weight_target DECIMAL(5, 2),
    weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    weight_timeframe VARCHAR(10) DEFAULT 'monthly' CHECK (weight_timeframe IN ('weekly', 'monthly')),
    water_glasses_target INT DEFAULT 8 CHECK (water_glasses_target > 0),
    fiber_grams_target INT DEFAULT 25 CHECK (fiber_grams_target > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valid_macro_percentages CHECK (
        protein_percentage + carbs_percentage + fat_percentage = 100
    )
);

-- Camera settings
CREATE TABLE camera_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    quality VARCHAR(10) DEFAULT 'high' CHECK (quality IN ('low', 'medium', 'high')),
    ai_processing BOOLEAN DEFAULT true,
    auto_capture BOOLEAN DEFAULT false,
    flash_default VARCHAR(10) DEFAULT 'auto' CHECK (flash_default IN ('auto', 'on', 'off')),
    save_to_gallery BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MEALS AND NUTRITION
-- ============================================================================

-- Main meals table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    timestamp TIMESTAMPTZ NOT NULL,

    -- Nutrition information
    calories INT CHECK (calories >= 0),
    protein DECIMAL(8, 2) CHECK (protein >= 0),  -- grams
    carbs DECIMAL(8, 2) CHECK (carbs >= 0),      -- grams
    fat DECIMAL(8, 2) CHECK (fat >= 0),          -- grams
    fiber DECIMAL(8, 2) CHECK (fiber >= 0),      -- grams
    sugar DECIMAL(8, 2) CHECK (sugar >= 0),      -- grams
    sodium DECIMAL(8, 2) CHECK (sodium >= 0),    -- milligrams
    water DECIMAL(8, 2) CHECK (water >= 0),      -- glasses/cups

    -- Additional meal information
    notes TEXT,
    is_verified BOOLEAN DEFAULT false,  -- User has verified/edited AI results

    -- Location (PostGIS point)
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    restaurant_name VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Create indexes for meal queries
CREATE INDEX idx_meals_user_id ON meals(user_id, timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_meals_timestamp ON meals(timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_meals_meal_type ON meals(meal_type, timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_meals_location ON meals USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_meals_created_at ON meals(created_at DESC);

-- Meal photos
CREATE TABLE meal_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INT,
    height INT,
    file_size INT,  -- bytes
    mime_type VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_meal_photos_meal_id ON meal_photos(meal_id, display_order);

-- Meal ingredients
CREATE TABLE meal_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    calories_per_serving DECIMAL(8, 2),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_meal_ingredients_meal_id ON meal_ingredients(meal_id, display_order);
CREATE INDEX idx_meal_ingredients_name ON meal_ingredients(ingredient_name);

-- AI analysis results
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    detected_items JSONB NOT NULL,  -- Array of detected food items
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    estimated_calories INT,
    suggested_meal_type VARCHAR(20),
    cuisine_type VARCHAR(100),

    -- AI insights
    health_score INT CHECK (health_score >= 0 AND health_score <= 100),
    nutrition_balance TEXT,
    recommendations TEXT[],
    warnings TEXT[],

    -- Processing metadata
    ai_model_version VARCHAR(50),
    processing_time_ms INT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_analyses_meal_id ON ai_analyses(meal_id);
CREATE INDEX idx_ai_analyses_confidence ON ai_analyses(confidence DESC);

-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

-- Posts (social sharing of meals)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
    content TEXT,
    privacy VARCHAR(20) DEFAULT 'friends' CHECK (privacy IN ('public', 'friends', 'private')),
    likes_count INT DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INT DEFAULT 0 CHECK (comments_count >= 0),
    shares_count INT DEFAULT 0 CHECK (shares_count >= 0),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_user_id ON posts(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_privacy ON posts(privacy, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_meal_id ON posts(meal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_featured ON posts(is_featured, created_at DESC) WHERE deleted_at IS NULL AND is_featured = true;

-- Post likes
CREATE TABLE post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_likes_user_id ON post_likes(user_id, created_at DESC);

-- Post comments
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0 CHECK (likes_count >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_post_comments_parent ON post_comments(parent_comment_id) WHERE deleted_at IS NULL;

-- User follows (social connections)
CREATE TABLE user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_created ON user_follows(created_at DESC);

-- ============================================================================
-- ANALYTICS AND TRACKING
-- ============================================================================

-- Daily summaries for quick stats retrieval
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Aggregate nutrition
    total_calories INT DEFAULT 0,
    total_protein DECIMAL(10, 2) DEFAULT 0,
    total_carbs DECIMAL(10, 2) DEFAULT 0,
    total_fat DECIMAL(10, 2) DEFAULT 0,
    total_fiber DECIMAL(10, 2) DEFAULT 0,
    total_sugar DECIMAL(10, 2) DEFAULT 0,
    total_sodium DECIMAL(10, 2) DEFAULT 0,
    total_water DECIMAL(10, 2) DEFAULT 0,

    -- Meal counts
    breakfast_count INT DEFAULT 0,
    lunch_count INT DEFAULT 0,
    dinner_count INT DEFAULT 0,
    snack_count INT DEFAULT 0,
    total_meals INT DEFAULT 0,

    -- Additional metrics
    average_health_score INT,
    goals_met BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- Analytics events for user behavior tracking
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),
    properties JSONB,
    session_id UUID,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Push notification tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) CHECK (platform IN ('ios', 'android')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id) WHERE is_active = true;

-- Notification log
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================================
-- AUDIT AND COMPLIANCE
-- ============================================================================

-- Audit log for tracking important changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_camera_settings_updated_at BEFORE UPDATE ON camera_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts with phone-based authentication';
COMMENT ON TABLE meals IS 'Individual meal entries with nutrition data and AI analysis';
COMMENT ON TABLE posts IS 'Social posts for sharing meals with the community';
COMMENT ON TABLE daily_summaries IS 'Pre-aggregated daily statistics for fast dashboard queries';
COMMENT ON TABLE ai_analyses IS 'AI-powered food recognition and nutrition analysis results';
COMMENT ON TABLE user_follows IS 'Social graph for following relationships between users';
COMMENT ON TABLE analytics_events IS 'User behavior tracking for product analytics';

COMMENT ON COLUMN meals.location IS 'PostGIS geography point for location-based queries';
COMMENT ON COLUMN meals.is_verified IS 'True when user has manually verified/corrected AI analysis';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp - NULL means active record';
COMMENT ON COLUMN ai_analyses.confidence IS 'AI confidence score between 0.0 and 1.0';
COMMENT ON COLUMN daily_summaries.goals_met IS 'Whether user met their daily nutrition goals';
