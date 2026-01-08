-- Mealio Complete Database with Sample Data
-- Includes schema and sample/seed data for development
-- Version: 1.0.0
-- Last Updated: 2025-08-28

-- ============================================================================
-- DATABASE SETUP
-- ============================================================================

-- Create database (run as superuser)
-- CREATE DATABASE mealio;
-- \c mealio;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";       -- For location data
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- For text search

-- ============================================================================
-- SCHEMA CREATION (Same as schema.sql)
-- ============================================================================

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

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

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

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

-- Main meals table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    timestamp TIMESTAMPTZ NOT NULL,
    calories INT CHECK (calories >= 0),
    protein DECIMAL(8, 2) CHECK (protein >= 0),
    carbs DECIMAL(8, 2) CHECK (carbs >= 0),
    fat DECIMAL(8, 2) CHECK (fat >= 0),
    fiber DECIMAL(8, 2) CHECK (fiber >= 0),
    sugar DECIMAL(8, 2) CHECK (sugar >= 0),
    sodium DECIMAL(8, 2) CHECK (sodium >= 0),
    water DECIMAL(8, 2) CHECK (water >= 0),
    notes TEXT,
    is_verified BOOLEAN DEFAULT false,
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    restaurant_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ
);

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
    file_size INT,
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
    detected_items JSONB NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    estimated_calories INT,
    suggested_meal_type VARCHAR(20),
    cuisine_type VARCHAR(100),
    health_score INT CHECK (health_score >= 0 AND health_score <= 100),
    nutrition_balance TEXT,
    recommendations TEXT[],
    warnings TEXT[],
    ai_model_version VARCHAR(50),
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_analyses_meal_id ON ai_analyses(meal_id);
CREATE INDEX idx_ai_analyses_confidence ON ai_analyses(confidence DESC);

-- Posts (social sharing)
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

-- User follows
CREATE TABLE user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_created ON user_follows(created_at DESC);

-- Daily summaries
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calories INT DEFAULT 0,
    total_protein DECIMAL(10, 2) DEFAULT 0,
    total_carbs DECIMAL(10, 2) DEFAULT 0,
    total_fat DECIMAL(10, 2) DEFAULT 0,
    total_fiber DECIMAL(10, 2) DEFAULT 0,
    total_sugar DECIMAL(10, 2) DEFAULT 0,
    total_sodium DECIMAL(10, 2) DEFAULT 0,
    total_water DECIMAL(10, 2) DEFAULT 0,
    breakfast_count INT DEFAULT 0,
    lunch_count INT DEFAULT 0,
    dinner_count INT DEFAULT 0,
    snack_count INT DEFAULT 0,
    total_meals INT DEFAULT 0,
    average_health_score INT,
    goals_met BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- Analytics events
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

-- Push tokens
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

-- Notifications
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

-- Audit logs
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

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- SAMPLE DATA
-- ============================================================================

-- Sample users
INSERT INTO users (id, username, phone, email, avatar_url, is_active, is_verified, last_login_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'alice_foodie', '+14155552671', 'alice@example.com', 'https://avatars.example.com/alice.jpg', true, true, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'bob_chef', '+14155552672', 'bob@example.com', 'https://avatars.example.com/bob.jpg', true, true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('33333333-3333-3333-3333-333333333333', 'carol_fit', '+14155552673', 'carol@example.com', 'https://avatars.example.com/carol.jpg', true, true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('44444444-4444-4444-4444-444444444444', 'dave_vegan', '+14155552674', 'dave@example.com', NULL, true, false, NULL),
    ('55555555-5555-5555-5555-555555555555', 'emma_baker', '+14155552675', 'emma@example.com', 'https://avatars.example.com/emma.jpg', true, true, CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Sample user preferences (for all users)
INSERT INTO user_preferences (user_id, language, theme, measurement_units)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'en', 'dark', 'metric'),
    ('22222222-2222-2222-2222-222222222222', 'en', 'light', 'imperial'),
    ('33333333-3333-3333-3333-333333333333', 'en', 'system', 'metric'),
    ('44444444-4444-4444-4444-444444444444', 'ko', 'dark', 'metric'),
    ('55555555-5555-5555-5555-555555555555', 'en', 'light', 'metric');

-- Sample notification settings
INSERT INTO notification_settings (user_id, meal_reminders, social_notifications, progress_updates)
VALUES
    ('11111111-1111-1111-1111-111111111111', true, true, true),
    ('22222222-2222-2222-2222-222222222222', true, false, true),
    ('33333333-3333-3333-3333-333333333333', true, true, true),
    ('44444444-4444-4444-4444-444444444444', false, false, false),
    ('55555555-5555-5555-5555-555555555555', true, true, false);

-- Sample privacy settings
INSERT INTO privacy_settings (user_id, profile_visibility, location_sharing)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'public', true),
    ('22222222-2222-2222-2222-222222222222', 'friends', false),
    ('33333333-3333-3333-3333-333333333333', 'public', true),
    ('44444444-4444-4444-4444-444444444444', 'private', false),
    ('55555555-5555-5555-5555-555555555555', 'friends', true);

-- Sample user goals
INSERT INTO user_goals (user_id, daily_calories, protein_percentage, carbs_percentage, fat_percentage, weight_target, weight_unit)
VALUES
    ('11111111-1111-1111-1111-111111111111', 2000, 25, 45, 30, 65.0, 'kg'),
    ('22222222-2222-2222-2222-222222222222', 2500, 30, 40, 30, 180.0, 'lbs'),
    ('33333333-3333-3333-3333-333333333333', 1800, 35, 35, 30, 55.0, 'kg'),
    ('44444444-4444-4444-4444-444444444444', 2200, 20, 55, 25, 70.0, 'kg'),
    ('55555555-5555-5555-5555-555555555555', 1900, 25, 50, 25, 60.0, 'kg');

-- Sample meals
INSERT INTO meals (id, user_id, name, meal_type, timestamp, calories, protein, carbs, fat, fiber, sugar, sodium, water, notes, is_verified, location, location_name, restaurant_name)
VALUES
    -- Alice's meals (today)
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Avocado Toast with Eggs', 'breakfast', CURRENT_TIMESTAMP - INTERVAL '8 hours', 420, 18.5, 35.2, 24.8, 9.2, 3.5, 380, 0.5, 'Perfect start to the day!', true, ST_GeogFromText('POINT(-122.4194 37.7749)'), 'Home', NULL),
    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Grilled Chicken Salad', 'lunch', CURRENT_TIMESTAMP - INTERVAL '4 hours', 380, 42.0, 18.5, 16.2, 6.8, 8.2, 520, 1.0, 'Light and refreshing', true, ST_GeogFromText('POINT(-122.4089 37.7837)'), 'Financial District', 'Sweetgreen'),
    ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Salmon with Quinoa', 'dinner', CURRENT_TIMESTAMP - INTERVAL '1 hour', 580, 38.5, 45.2, 22.8, 8.2, 4.5, 480, 1.5, 'Omega-3 boost!', true, ST_GeogFromText('POINT(-122.4194 37.7749)'), 'Home', NULL),

    -- Bob's meals (today and yesterday)
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Protein Pancakes', 'breakfast', CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '9 hours', 450, 28.0, 55.0, 12.0, 4.5, 15.0, 350, 0.5, 'Pre-workout fuel', true, NULL, NULL, NULL),
    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Turkey Sandwich', 'lunch', CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '5 hours', 420, 32.0, 48.0, 12.5, 6.0, 8.0, 890, 0.5, NULL, false, NULL, NULL, NULL),
    ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Steak and Vegetables', 'dinner', CURRENT_TIMESTAMP - INTERVAL '1 day' - INTERVAL '2 hours', 680, 45.0, 32.0, 38.0, 8.5, 6.0, 720, 1.0, 'Grill master!', true, ST_GeogFromText('POINT(-122.3964 37.7913)'), 'SOMA', 'House of Prime Rib'),

    -- Carol's meals (fitness focused)
    ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Greek Yogurt Bowl', 'breakfast', CURRENT_TIMESTAMP - INTERVAL '10 hours', 320, 24.0, 38.0, 8.5, 5.0, 22.0, 120, 0.5, 'Post-workout', true, NULL, NULL, NULL),
    ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Quinoa Buddha Bowl', 'lunch', CURRENT_TIMESTAMP - INTERVAL '5 hours', 480, 18.0, 62.0, 18.5, 12.0, 8.5, 480, 1.5, 'Colorful and nutritious', true, NULL, NULL, NULL),
    ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Protein Smoothie', 'snack', CURRENT_TIMESTAMP - INTERVAL '2 hours', 280, 25.0, 35.0, 6.0, 4.0, 24.0, 180, 2.0, 'Recovery drink', true, NULL, NULL, NULL),

    -- Dave's meals (vegan)
    ('d1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Overnight Oats', 'breakfast', CURRENT_TIMESTAMP - INTERVAL '7 hours', 380, 12.0, 58.0, 14.0, 8.5, 18.0, 220, 1.0, 'Almond milk base', true, NULL, NULL, NULL),
    ('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Lentil Curry', 'lunch', CURRENT_TIMESTAMP - INTERVAL '3 hours', 420, 22.0, 55.0, 12.5, 14.0, 8.0, 580, 1.0, 'Spicy and filling', true, ST_GeogFromText('POINT(-122.4217 37.7653)'), 'Mission District', 'Shizen Vegan Sushi'),

    -- Emma's meals (baker)
    ('e1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Croissant and Coffee', 'breakfast', CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '8 hours', 380, 8.0, 42.0, 22.0, 2.0, 8.0, 420, 0.5, 'Testing my new recipe', true, NULL, NULL, NULL),
    ('e2222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Caprese Sandwich', 'lunch', CURRENT_TIMESTAMP - INTERVAL '2 days' - INTERVAL '4 hours', 450, 18.0, 48.0, 22.0, 4.0, 6.0, 680, 0.5, NULL, false, NULL, NULL, NULL);

-- Sample meal photos
INSERT INTO meal_photos (meal_id, photo_url, thumbnail_url, width, height, file_size, mime_type, display_order)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'https://storage.example.com/meals/a1111111.jpg', 'https://storage.example.com/meals/thumb_a1111111.jpg', 1920, 1080, 524288, 'image/jpeg', 0),
    ('a2222222-2222-2222-2222-222222222222', 'https://storage.example.com/meals/a2222222.jpg', 'https://storage.example.com/meals/thumb_a2222222.jpg', 1920, 1080, 489632, 'image/jpeg', 0),
    ('a3333333-3333-3333-3333-333333333333', 'https://storage.example.com/meals/a3333333.jpg', 'https://storage.example.com/meals/thumb_a3333333.jpg', 1920, 1080, 612352, 'image/jpeg', 0),
    ('b3333333-3333-3333-3333-333333333333', 'https://storage.example.com/meals/b3333333.jpg', 'https://storage.example.com/meals/thumb_b3333333.jpg', 1920, 1080, 712648, 'image/jpeg', 0),
    ('c1111111-1111-1111-1111-111111111111', 'https://storage.example.com/meals/c1111111.jpg', 'https://storage.example.com/meals/thumb_c1111111.jpg', 1920, 1080, 445632, 'image/jpeg', 0);

-- Sample meal ingredients
INSERT INTO meal_ingredients (meal_id, ingredient_name, quantity, unit, calories_per_serving, display_order)
VALUES
    -- Avocado Toast ingredients
    ('a1111111-1111-1111-1111-111111111111', 'Whole wheat bread', 2, 'slices', 160, 0),
    ('a1111111-1111-1111-1111-111111111111', 'Avocado', 1, 'medium', 200, 1),
    ('a1111111-1111-1111-1111-111111111111', 'Eggs', 2, 'large', 140, 2),
    ('a1111111-1111-1111-1111-111111111111', 'Cherry tomatoes', 5, 'pieces', 20, 3),

    -- Grilled Chicken Salad ingredients
    ('a2222222-2222-2222-2222-222222222222', 'Chicken breast', 150, 'grams', 180, 0),
    ('a2222222-2222-2222-2222-222222222222', 'Mixed greens', 200, 'grams', 40, 1),
    ('a2222222-2222-2222-2222-222222222222', 'Olive oil dressing', 2, 'tablespoons', 120, 2),
    ('a2222222-2222-2222-2222-222222222222', 'Quinoa', 50, 'grams', 60, 3);

-- Sample AI analyses
INSERT INTO ai_analyses (meal_id, detected_items, confidence, estimated_calories, suggested_meal_type, cuisine_type, health_score, nutrition_balance, recommendations, warnings, ai_model_version, processing_time_ms)
VALUES
    ('a1111111-1111-1111-1111-111111111111',
     '["avocado toast", "fried eggs", "cherry tomatoes", "whole wheat bread"]'::jsonb,
     0.92, 420, 'breakfast', 'American', 85,
     'High in healthy fats and protein',
     ARRAY['Great source of omega-3', 'Good protein-to-carb ratio'],
     NULL,
     'food-vision-v2.3.1', 245),

    ('a2222222-2222-2222-2222-222222222222',
     '["grilled chicken", "mixed salad", "olive oil", "quinoa"]'::jsonb,
     0.88, 380, 'lunch', 'Mediterranean', 92,
     'Excellent lean protein with vegetables',
     ARRAY['Perfect macro balance', 'Rich in micronutrients'],
     NULL,
     'food-vision-v2.3.1', 189),

    ('a3333333-3333-3333-3333-333333333333',
     '["salmon fillet", "quinoa", "broccoli", "lemon"]'::jsonb,
     0.94, 580, 'dinner', 'Healthy', 95,
     'Omega-3 rich with complete proteins',
     ARRAY['Excellent source of omega-3 fatty acids', 'Anti-inflammatory properties'],
     NULL,
     'food-vision-v2.3.1', 201);

-- Sample posts
INSERT INTO posts (id, user_id, meal_id, content, privacy, likes_count, comments_count)
VALUES
    ('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Starting my day right with this amazing avocado toast! #HealthyEating #Breakfast', 'public', 12, 3),
    ('p2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Light lunch at Sweetgreen. Love their grilled chicken salad! 🥗', 'friends', 8, 2),
    ('p3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'Grilled the perfect steak tonight! Medium-rare perfection 🥩', 'public', 25, 5),
    ('p4444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Post-workout fuel! Greek yogurt bowl with berries and granola 💪', 'public', 18, 4);

-- Sample post likes
INSERT INTO post_likes (post_id, user_id)
VALUES
    ('p1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
    ('p1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
    ('p1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555'),
    ('p3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
    ('p3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
    ('p4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');

-- Sample post comments
INSERT INTO post_comments (post_id, user_id, content)
VALUES
    ('p1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'That looks amazing! What bread do you use?'),
    ('p1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Perfect macros for breakfast! 💯'),
    ('p3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Teach me your grilling secrets!'),
    ('p4444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'Great post-workout choice!');

-- Sample user follows
INSERT INTO user_follows (follower_id, following_id)
VALUES
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'),
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');

-- Sample daily summaries (auto-calculated in production)
INSERT INTO daily_summaries (user_id, date, total_calories, total_protein, total_carbs, total_fat, total_fiber, total_water, breakfast_count, lunch_count, dinner_count, total_meals, average_health_score, goals_met)
VALUES
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE, 1380, 99.0, 98.9, 63.8, 24.2, 3.0, 1, 1, 1, 3, 91, true),
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 1520, 85.5, 115.2, 58.4, 22.8, 2.5, 1, 1, 1, 3, 88, true),
    ('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', 1550, 105.0, 135.0, 62.5, 19.0, 2.0, 1, 1, 1, 3, 82, false),
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, 1080, 67.0, 135.0, 33.0, 21.0, 4.0, 1, 1, 0, 3, 89, true);

-- Sample notifications
INSERT INTO notifications (user_id, type, title, body, data)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'social', 'New follower', 'emma_baker started following you', '{"follower_id": "55555555-5555-5555-5555-555555555555"}'::jsonb),
    ('11111111-1111-1111-1111-111111111111', 'meal_reminder', 'Lunch time!', 'Don''t forget to log your lunch', '{"meal_type": "lunch"}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'progress', 'Weekly summary', 'You met your goals 6 out of 7 days!', '{"week_start": "2025-08-21", "goals_met": 6}'::jsonb);

-- Sample analytics events
INSERT INTO analytics_events (user_id, event_name, event_category, properties, session_id)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'meal_logged', 'engagement', '{"meal_type": "breakfast", "has_photo": true}'::jsonb, 'sess-123456'),
    ('11111111-1111-1111-1111-111111111111', 'post_created', 'social', '{"privacy": "public", "has_meal": true}'::jsonb, 'sess-123456'),
    ('22222222-2222-2222-2222-222222222222', 'app_opened', 'session', '{"version": "1.0.0", "platform": "ios"}'::jsonb, 'sess-234567'),
    ('33333333-3333-3333-3333-333333333333', 'goals_updated', 'settings', '{"changed_fields": ["daily_calories", "protein_percentage"]}'::jsonb, 'sess-345678');

-- ============================================================================
-- USEFUL QUERIES FOR TESTING
-- ============================================================================

-- Get user's meals for today
-- SELECT m.*, mp.photo_url
-- FROM meals m
-- LEFT JOIN meal_photos mp ON m.id = mp.meal_id AND mp.display_order = 0
-- WHERE m.user_id = '11111111-1111-1111-1111-111111111111'
--   AND DATE(m.timestamp) = CURRENT_DATE
--   AND m.deleted_at IS NULL
-- ORDER BY m.timestamp DESC;

-- Get social feed
-- SELECT p.*, u.username, u.avatar_url, m.name as meal_name, mp.photo_url
-- FROM posts p
-- JOIN users u ON p.user_id = u.id
-- LEFT JOIN meals m ON p.meal_id = m.id
-- LEFT JOIN meal_photos mp ON m.id = mp.meal_id AND mp.display_order = 0
-- WHERE p.privacy = 'public'
--   AND p.deleted_at IS NULL
-- ORDER BY p.created_at DESC
-- LIMIT 20;

-- Get user's nutrition summary for the week
-- SELECT
--   DATE(timestamp) as date,
--   SUM(calories) as total_calories,
--   SUM(protein) as total_protein,
--   SUM(carbs) as total_carbs,
--   SUM(fat) as total_fat
-- FROM meals
-- WHERE user_id = '11111111-1111-1111-1111-111111111111'
--   AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
--   AND deleted_at IS NULL
-- GROUP BY DATE(timestamp)
-- ORDER BY date DESC;
