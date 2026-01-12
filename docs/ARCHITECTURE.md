# Mealio Database Architecture

## Overview

This document describes the database schema design for Mealio, a meal tracking and nutrition analysis mobile application. The schema is designed for PostgreSQL and supports all features discovered in the mobile app.

## Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────────┐
│     users       │─────────│   user_settings     │
└────────┬────────┘   1:1   └─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────────┐
│  diary_entries  │─────────│  entry_locations    │
└────────┬────────┘   1:1   └─────────────────────┘
         │
    ┌────┼────┬─────────────┬─────────────────┐
    │    │    │             │                 │
   1:N  1:1  1:1           1:1               N:M
    │    │    │             │                 │
    ▼    ▼    ▼             ▼                 ▼
┌───────┐┌─────────┐┌───────────────┐┌───────────────────┐
│photos ││nutrition││ ai_analyses   ││entry_ingredients  │
└───────┘└─────────┘└───────┬───────┘└─────────┬─────────┘
                            │                   │
                           1:N                  │
                            │                   │
                            ▼                   ▼
                    ┌───────────────┐   ┌─────────────┐
                    │recommendations│   │ ingredients │
                    └───────────────┘   └─────────────┘
```

## Entities

### Core Entities

#### users
- **Purpose**: User accounts with OAuth authentication
- **Primary Key**: `id` (BIGINT, auto-increment)
- **Key Fields**: email (unique), auth_provider, provider_user_id
- **Soft Delete**: Yes (deleted_at)

#### user_settings
- **Purpose**: User preferences and app settings
- **Relationship**: 1:1 with users (auto-created via trigger)
- **Covers**: Theme, language, notifications, camera settings, privacy

#### diary_entries
- **Purpose**: Core meal diary entries
- **Primary Key**: `id` (BIGINT, auto-increment)
- **Key Fields**: user_id (FK), recorded_at, meal_type, notes
- **Soft Delete**: Yes (deleted_at)

### Supporting Entities

#### entry_locations
- **Purpose**: Geolocation data for entries
- **Relationship**: 1:1 with diary_entries
- **Fields**: latitude, longitude, address, restaurant_name

#### entry_photos
- **Purpose**: Multiple photos per entry
- **Relationship**: N:1 with diary_entries (up to 10 photos)
- **Fields**: photo_uri, thumbnail_uri, dimensions, ordering

#### nutrition_info
- **Purpose**: Nutritional data per entry
- **Relationship**: 1:1 with diary_entries
- **Fields**: calories, protein, carbs, fat, plus optional micronutrients

#### ai_analyses
- **Purpose**: AI-generated meal analysis
- **Relationship**: 1:1 with diary_entries
- **Fields**: detected_meals, confidence, health_score, comment

#### ingredients
- **Purpose**: Master ingredient list
- **Relationship**: N:M with diary_entries via entry_ingredients
- **Fields**: name (English), name_ko (Korean)

### Analytics Entities

#### daily_nutrition_summary
- **Purpose**: Pre-aggregated daily statistics
- **Type**: Denormalized cache table
- **Sync Strategy**: Update on entry create/update/delete

## Design Decisions

### 1. ID Strategy: BIGINT Auto-Increment

**Decision**: Use `BIGINT GENERATED ALWAYS AS IDENTITY` for all primary keys.

**Rationale**:
- Simpler than UUIDs for a single-database application
- More storage efficient (8 bytes vs 16 bytes)
- Better index performance
- Predictable ordering aligns with creation time

**Trade-off**: IDs are predictable. If external exposure is needed, implement a separate public ID strategy.

### 2. Soft Deletes for User Data

**Decision**: Implement soft deletes on `users` and `diary_entries` tables.

**Rationale**:
- Supports "undo" functionality in the UI
- Maintains data integrity for analytics
- Required for data recovery scenarios

**Implementation**:
```sql
deleted_at TIMESTAMPTZ
```

**Query Pattern**:
```sql
WHERE deleted_at IS NULL
```

**Partial Index** for performance:
```sql
CREATE INDEX ... WHERE deleted_at IS NULL
```

### 3. Separate Location Table

**Decision**: Extract location data to `entry_locations` instead of embedding in `diary_entries`.

**Rationale**:
- Location is optional (many entries won't have it)
- Reduces row size for main table
- Enables location-specific indexes without bloating entry indexes
- Clean separation of concerns

### 4. Nutrition as Separate Table

**Decision**: Store nutrition in `nutrition_info` table rather than diary_entries.

**Rationale**:
- Not all entries will have nutrition data initially
- Nutrition data changes independently (user corrections)
- Allows tracking verification status (AI vs user-verified)
- Cleaner schema for a complex data structure

### 5. JSONB for Flexible AI Data

**Decision**: Use JSONB for `detected_meals` in ai_analyses.

**Rationale**:
- Variable number of detected items
- Schema may evolve as AI model improves
- PostgreSQL JSONB is efficient and indexable

**Example**:
```json
["Grilled chicken", "Mixed salad", "Olive oil dressing"]
```

### 6. Ingredient Master List with Junction Table

**Decision**: Normalize ingredients with a junction table.

**Rationale**:
- Enables ingredient statistics across all entries
- Supports autocomplete/search functionality
- Allows bilingual names (English + Korean)
- Prevents duplicate ingredient entries

**Trade-off**: Slightly more complex queries. Mitigated by proper indexing.

### 7. Pre-Aggregated Daily Statistics

**Decision**: Maintain `daily_nutrition_summary` as a denormalized table.

**Rationale**:
- Dashboard queries are frequent
- Calculating aggregates on-the-fly is expensive
- Mobile app needs fast response times

**Sync Strategy**:
1. Update via application code on entry changes
2. Or: Implement as a materialized view with periodic refresh
3. Or: Use triggers (shown in SQL file)

**Staleness Tolerance**: Acceptable for dashboard display (real-time not required)

## Relationships Summary

| Relationship | Type | On Delete | Notes |
|--------------|------|-----------|-------|
| users -> user_settings | 1:1 | CASCADE | Auto-created via trigger |
| users -> diary_entries | 1:N | CASCADE | User owns all entries |
| users -> auth_tokens | 1:N | CASCADE | Multiple sessions allowed |
| diary_entries -> entry_locations | 1:1 | CASCADE | Optional location |
| diary_entries -> entry_photos | 1:N | CASCADE | Up to 10 photos |
| diary_entries -> nutrition_info | 1:1 | CASCADE | Optional nutrition |
| diary_entries -> ai_analyses | 1:1 | CASCADE | Optional AI analysis |
| diary_entries -> entry_ingredients | N:M | CASCADE | Via junction table |
| ai_analyses -> ai_recommendations | 1:N | CASCADE | Multiple recommendations |
| ingredients -> entry_ingredients | N:M | RESTRICT | Preserve ingredients |

## Indexing Strategy

### Primary Access Patterns

1. **Get user's entries for a date range**
   ```sql
   -- Uses: diary_entries_user_recorded_idx
   WHERE user_id = ? AND recorded_at BETWEEN ? AND ?
   ```

2. **Get user's entries by meal type**
   ```sql
   -- Uses: diary_entries_user_meal_type_idx
   WHERE user_id = ? AND meal_type = ?
   ```

3. **Daily nutrition dashboard**
   ```sql
   -- Uses: daily_nutrition_summary_user_date_idx
   WHERE user_id = ? AND date BETWEEN ? AND ?
   ```

### Partial Indexes for Common Filters

```sql
-- Active entries only (excludes soft-deleted)
CREATE INDEX diary_entries_active_idx ON diary_entries(user_id, deleted_at)
    WHERE deleted_at IS NULL;

-- Active auth tokens only
CREATE INDEX auth_tokens_user_active_idx ON auth_tokens(user_id, revoked_at)
    WHERE revoked_at IS NULL;

-- Primary photos only
CREATE INDEX entry_photos_primary_idx ON entry_photos(entry_id, is_primary)
    WHERE is_primary = TRUE;
```

## Data Integrity

### Constraints Applied

1. **NOT NULL** on all required fields
2. **UNIQUE** on natural keys (email, auth_provider + provider_user_id)
3. **CHECK** constraints for enums and ranges:
   - `rating` between 1-5
   - `confidence` between 0-100
   - `health_score` between 0-100
   - Enum values for auth_provider, theme, language, etc.
4. **FOREIGN KEY** with appropriate ON DELETE actions

### Timestamp Handling

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- `created_at` is immutable (set once)
- `updated_at` auto-updates via trigger
- All times stored in UTC

## Migration Safety

### Adding New Features

1. **New nullable column**: Safe, instant
2. **New table**: Safe, no locks
3. **New index**: Use `CREATE INDEX CONCURRENTLY`

### Schema Changes Requiring Care

1. **Adding NOT NULL constraint**: Add CHECK NOT VALID, then VALIDATE
2. **Modifying column type**: May require table rewrite
3. **Dropping column**: Consider soft-deprecation first

## Future Considerations

### Potential Enhancements

1. **Meal planning**: New tables for planned meals and shopping lists
2. **Social features**: Followers, shared entries, comments
3. **Nutrition goals**: User-defined daily/weekly targets
4. **Restaurant reviews**: Expanded location features
5. **Recipe import**: Integration with recipe databases

### Scaling Paths

1. **Read replicas**: For heavy read workloads
2. **Table partitioning**: By date for diary_entries if data grows large
3. **Archival strategy**: Move old entries to cold storage

## Files

- `schema.dbml` - Visual schema definition
- `schema.sql` - PostgreSQL DDL with all indexes, constraints, and triggers
