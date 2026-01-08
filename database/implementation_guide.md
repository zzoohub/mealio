# Mealio Database Implementation Guide

## 🚀 Quick Start

### ERD Visualization
View the complete Entity Relationship Diagram: [dbdiagram.io/mealio](https://dbdiagram.io/d/mealio-676e5f8c5e0e7f3e4e9a2b1c)

### Docker PostgreSQL Setup
```bash
# Quick start with Docker
docker run --name mealio-db \
  -e POSTGRES_DB=mealio \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v mealio_data:/var/lib/postgresql/data \
  -d postgis/postgis:15-3.3

# Apply schema
docker exec -i mealio-db psql -U postgres -d mealio < database/schema.sql

# Load sample data (optional)
docker exec -i mealio-db psql -U postgres -d mealio < database/database.sql
```

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/mealio
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mealio
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL_MODE=disable  # Use 'require' in production
```

## 🏗️ Phased Implementation Roadmap

### Phase 1: MVP Core (Week 1)
**Goal**: Basic meal logging with phone authentication

#### Tables to Create
```sql
-- 1. Users and authentication
CREATE TABLE users (...);
CREATE TABLE phone_verifications (...);
CREATE TABLE user_sessions (...);

-- 2. Core meals functionality
CREATE TABLE meals (...);
CREATE TABLE meal_photos (...);
CREATE TABLE meal_ingredients (...);

-- 3. User settings
CREATE TABLE user_preferences (...);
CREATE TABLE user_goals (...);
```

#### Essential Indexes
```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_meals_user_id ON meals(user_id, timestamp DESC);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
```

#### MVP API Endpoints
- `POST /auth/send-code` - Send verification SMS
- `POST /auth/verify` - Verify code and create session
- `GET /meals` - List user's meals
- `POST /meals` - Create new meal
- `POST /meals/:id/photos` - Upload meal photo

### Phase 2: Social Features (Weeks 2-3)
**Goal**: Enable social sharing and interactions

#### Additional Tables
```sql
-- Social features
CREATE TABLE posts (...);
CREATE TABLE post_likes (...);
CREATE TABLE post_comments (...);
CREATE TABLE user_follows (...);

-- Notifications
CREATE TABLE notifications (...);
CREATE TABLE push_tokens (...);
```

#### New Indexes
```sql
CREATE INDEX idx_posts_privacy ON posts(privacy, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

#### Social API Endpoints
- `GET /feed` - Get social feed
- `POST /posts` - Create post from meal
- `POST /posts/:id/like` - Like a post
- `POST /users/:id/follow` - Follow user

### Phase 3: AI & Analytics (Weeks 4-6)
**Goal**: AI-powered nutrition analysis and insights

#### AI and Analytics Tables
```sql
-- AI analysis
CREATE TABLE ai_analyses (...);

-- Analytics
CREATE TABLE daily_summaries (...);
CREATE TABLE analytics_events (...);
```

#### Performance Tables
```sql
-- Create materialized view for fast stats
CREATE MATERIALIZED VIEW user_weekly_stats AS
SELECT 
  user_id,
  DATE_TRUNC('week', timestamp) as week,
  COUNT(*) as meal_count,
  AVG(calories) as avg_calories,
  AVG(protein) as avg_protein
FROM meals
WHERE deleted_at IS NULL
GROUP BY user_id, DATE_TRUNC('week', timestamp);

CREATE INDEX ON user_weekly_stats(user_id, week DESC);
```

### Phase 4: Scale & Optimize (Ongoing)
**Goal**: Handle 10K+ concurrent users

#### Partitioning Strategy
```sql
-- Partition meals by month for better performance
CREATE TABLE meals_2025_01 PARTITION OF meals
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Partition analytics_events by day
CREATE TABLE analytics_events_2025_01_01 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');
```

## 💻 SQL Implementation Scripts

### User Authentication Flow
```sql
-- 1. Phone verification request
INSERT INTO phone_verifications (phone, verification_code, expires_at)
VALUES ('+14155552671', '123456', NOW() + INTERVAL '10 minutes')
RETURNING id;

-- 2. Verify code and create user
WITH verified AS (
  UPDATE phone_verifications 
  SET is_verified = true, verified_at = NOW()
  WHERE phone = '+14155552671' 
    AND verification_code = '123456'
    AND expires_at > NOW()
    AND is_verified = false
  RETURNING phone
)
INSERT INTO users (username, phone, is_verified)
SELECT 'user_' || SUBSTRING(phone FROM 12), phone, true
FROM verified
RETURNING id, username;

-- 3. Create session
INSERT INTO user_sessions (user_id, token_hash, expires_at)
VALUES (
  'user-uuid-here',
  SHA256('random-token-here'),
  NOW() + INTERVAL '30 days'
);
```

### Meal Logging with AI Analysis
```sql
-- 1. Create meal with transaction
BEGIN;

-- Insert meal
INSERT INTO meals (
  user_id, name, meal_type, timestamp, 
  calories, protein, carbs, fat
) VALUES (
  'user-uuid', 'Grilled Chicken Salad', 'lunch', NOW(),
  380, 42.0, 18.5, 16.2
) RETURNING id INTO meal_id;

-- Add photo
INSERT INTO meal_photos (meal_id, photo_url, width, height)
VALUES (meal_id, 'https://storage/photo.jpg', 1920, 1080);

-- Add AI analysis
INSERT INTO ai_analyses (
  meal_id, detected_items, confidence, health_score
) VALUES (
  meal_id, 
  '["grilled chicken", "mixed greens", "tomatoes"]'::jsonb,
  0.92, 
  85
);

-- Update daily summary
INSERT INTO daily_summaries (user_id, date, total_calories, lunch_count)
VALUES ('user-uuid', CURRENT_DATE, 380, 1)
ON CONFLICT (user_id, date) DO UPDATE
SET 
  total_calories = daily_summaries.total_calories + 380,
  lunch_count = daily_summaries.lunch_count + 1;

COMMIT;
```

### Social Feed Query
```sql
-- Get personalized feed with pagination
WITH user_network AS (
  SELECT following_id FROM user_follows WHERE follower_id = $1
)
SELECT 
  p.*,
  u.username,
  u.avatar_url,
  m.name as meal_name,
  mp.photo_url,
  EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
  ARRAY(
    SELECT jsonb_build_object(
      'id', pc.id,
      'username', cu.username,
      'content', pc.content
    )
    FROM post_comments pc
    JOIN users cu ON pc.user_id = cu.id
    WHERE pc.post_id = p.id
    ORDER BY pc.created_at DESC
    LIMIT 2
  ) as recent_comments
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN meals m ON p.meal_id = m.id
LEFT JOIN meal_photos mp ON m.id = mp.meal_id AND mp.display_order = 0
WHERE 
  p.deleted_at IS NULL
  AND (
    p.privacy = 'public' 
    OR (p.privacy = 'friends' AND p.user_id IN (SELECT * FROM user_network))
    OR p.user_id = $1
  )
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;
```

### Nutrition Analytics
```sql
-- Weekly nutrition summary with goals comparison
WITH weekly_stats AS (
  SELECT 
    DATE(timestamp) as date,
    SUM(calories) as daily_calories,
    SUM(protein) as daily_protein,
    SUM(carbs) as daily_carbs,
    SUM(fat) as daily_fat,
    COUNT(*) as meal_count
  FROM meals
  WHERE 
    user_id = $1
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
    AND deleted_at IS NULL
  GROUP BY DATE(timestamp)
),
user_goals AS (
  SELECT * FROM user_goals WHERE user_id = $1
)
SELECT 
  ws.*,
  ug.daily_calories as target_calories,
  ROUND((ws.daily_calories::numeric / ug.daily_calories) * 100) as calories_percentage,
  CASE 
    WHEN ws.daily_calories BETWEEN ug.daily_calories * 0.9 AND ug.daily_calories * 1.1 
    THEN true 
    ELSE false 
  END as goal_met
FROM weekly_stats ws
CROSS JOIN user_goals ug
ORDER BY ws.date DESC;
```

## 📊 Query Optimization Patterns

### 1. Meal History with Filters
```sql
-- Optimized meal history query
CREATE OR REPLACE FUNCTION get_meal_history(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_meal_type VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  name VARCHAR,
  meal_type VARCHAR,
  timestamp TIMESTAMPTZ,
  calories INT,
  photo_url TEXT,
  health_score INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.meal_type,
    m.timestamp,
    m.calories,
    mp.photo_url,
    aa.health_score
  FROM meals m
  LEFT JOIN meal_photos mp ON m.id = mp.meal_id AND mp.display_order = 0
  LEFT JOIN ai_analyses aa ON m.id = aa.meal_id
  WHERE 
    m.user_id = p_user_id
    AND m.deleted_at IS NULL
    AND (p_start_date IS NULL OR DATE(m.timestamp) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(m.timestamp) <= p_end_date)
    AND (p_meal_type IS NULL OR m.meal_type = p_meal_type)
  ORDER BY m.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

### 2. Nearby Restaurants
```sql
-- Find popular restaurants near user
CREATE OR REPLACE FUNCTION find_nearby_restaurants(
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_radius_meters INT DEFAULT 5000
) RETURNS TABLE (
  restaurant_name VARCHAR,
  meal_count BIGINT,
  avg_calories NUMERIC,
  avg_health_score NUMERIC,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.restaurant_name,
    COUNT(*) as meal_count,
    ROUND(AVG(m.calories)) as avg_calories,
    ROUND(AVG(aa.health_score)) as avg_health_score,
    ST_Distance(
      m.location,
      ST_MakePoint(p_longitude, p_latitude)::geography
    ) as distance_meters
  FROM meals m
  LEFT JOIN ai_analyses aa ON m.id = aa.meal_id
  WHERE 
    m.restaurant_name IS NOT NULL
    AND m.deleted_at IS NULL
    AND ST_DWithin(
      m.location,
      ST_MakePoint(p_longitude, p_latitude)::geography,
      p_radius_meters
    )
  GROUP BY m.restaurant_name, m.location
  ORDER BY meal_count DESC, distance_meters
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

## ⚡ Performance Optimization

### Index Strategy
```sql
-- Core performance indexes
CREATE INDEX CONCURRENTLY idx_meals_user_timestamp 
  ON meals(user_id, timestamp DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_posts_feed 
  ON posts(privacy, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Covering indexes for common queries
CREATE INDEX CONCURRENTLY idx_meals_summary 
  ON meals(user_id, timestamp, calories, protein, carbs, fat) 
  WHERE deleted_at IS NULL;

-- Partial indexes for specific queries
CREATE INDEX CONCURRENTLY idx_meals_unverified 
  ON meals(user_id, created_at DESC) 
  WHERE is_verified = false AND deleted_at IS NULL;
```

### Connection Pooling Configuration
```yaml
# PgBouncer configuration
[databases]
mealio = host=localhost port=5432 dbname=mealio

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
```

### Query Performance Monitoring
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries taking > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan;
```

## 🚨 Common Issues and Solutions

### 1. Slow Feed Queries
**Problem**: Social feed queries become slow with many users
**Solution**: 
```sql
-- Create materialized view for feed
CREATE MATERIALIZED VIEW feed_cache AS
SELECT ... FROM posts ...;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY feed_cache;
```

### 2. Storage Growth
**Problem**: Photo URLs and analytics events consuming too much space
**Solution**:
```sql
-- Archive old analytics events
INSERT INTO analytics_events_archive 
SELECT * FROM analytics_events 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM analytics_events 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Use table partitioning for automatic management
```

### 3. Lock Contention
**Problem**: Updates to daily_summaries causing locks
**Solution**:
```sql
-- Use advisory locks for batch updates
SELECT pg_advisory_lock(user_id::bigint);
-- Perform updates
SELECT pg_advisory_unlock(user_id::bigint);
```

## 📈 Migration Strategy

### Adding New Columns
```sql
-- Safe column addition (no lock on large tables)
ALTER TABLE meals ADD COLUMN IF NOT EXISTS restaurant_rating INT;

-- Backfill in batches
DO $$
DECLARE
  batch_size INT := 1000;
BEGIN
  LOOP
    UPDATE meals 
    SET restaurant_rating = 0 
    WHERE 
      restaurant_rating IS NULL 
      AND id IN (
        SELECT id FROM meals 
        WHERE restaurant_rating IS NULL 
        LIMIT batch_size
      );
    
    EXIT WHEN NOT FOUND;
    PERFORM pg_sleep(0.1); -- Prevent lock buildup
  END LOOP;
END $$;

-- Add constraint after backfill
ALTER TABLE meals ADD CONSTRAINT check_rating 
  CHECK (restaurant_rating >= 0 AND restaurant_rating <= 5);
```

### Zero-Downtime Index Creation
```sql
-- Create index without blocking
CREATE INDEX CONCURRENTLY idx_new_column ON meals(new_column);

-- Verify index is valid
SELECT indexrelid::regclass, indisvalid 
FROM pg_index 
WHERE indexrelid::regclass::text = 'idx_new_column';
```

## 🔒 Security Considerations

### Row-Level Security
```sql
-- Enable RLS for multi-tenant isolation
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY meals_isolation ON meals
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Set user context in application
SET LOCAL app.current_user_id = 'user-uuid';
```

### Data Encryption
```sql
-- Encrypt sensitive data at rest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted phone numbers
UPDATE users 
SET phone = pgp_sym_encrypt(phone, 'encryption-key')
WHERE phone IS NOT NULL;
```

## 🛠️ Maintenance Tasks

### Daily Maintenance
```sql
-- Update statistics for query planner
ANALYZE meals, posts, users;

-- Clean up expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();

-- Update daily summaries
CALL update_daily_summaries_for_date(CURRENT_DATE);
```

### Weekly Maintenance
```sql
-- Vacuum tables to reclaim space
VACUUM (ANALYZE) meals, posts, analytics_events;

-- Rebuild materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY user_weekly_stats;

-- Archive old notifications
INSERT INTO notifications_archive 
SELECT * FROM notifications 
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Monthly Maintenance
```sql
-- Reindex heavily updated tables
REINDEX CONCURRENTLY INDEX idx_meals_user_id;
REINDEX CONCURRENTLY INDEX idx_posts_privacy;

-- Full vacuum if needed (requires downtime)
-- VACUUM FULL meals;

-- Check for unused indexes
SELECT * FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';
```

## 📋 Backup and Recovery

### Backup Strategy
```bash
# Daily backup with compression
pg_dump -Fc -Z9 mealio > backup_$(date +%Y%m%d).dump

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

# Test restore
pg_restore -d mealio_test backup_20250828.dump
```

### Disaster Recovery Plan
1. **RPO Target**: < 1 hour of data loss
2. **RTO Target**: < 2 hours to restore
3. **Backup Locations**: Primary + S3 + Geographic replica
4. **Test Schedule**: Monthly restore tests

## 🚦 Monitoring Alerts

### Critical Metrics
```sql
-- Connection saturation
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' AND now() - query_start > '5 minutes'::interval;

-- Table bloat
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📚 Additional Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)
- [PostgreSQL Monitoring with pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
