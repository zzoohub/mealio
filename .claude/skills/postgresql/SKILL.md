---
name: postgresql
description: |
  PostgreSQL problem-solving patterns for production systems.
  Use when: query optimization, concurrency issues, zero-downtime migrations, scaling decisions, debugging slow queries, implementing patterns from data-modeling skill.
  Do not use for: basic DDL/DML syntax (use context7), schema design decisions (use data-modeling skill first).
  Workflow: data-modeling skill (design) → this skill (implement).
---

# PostgreSQL Patterns

For basic DDL/DML syntax, use context7. This skill focuses on **solving specific problems**.

**Prerequisite**: Schema should be designed using `data-modeling` skill first. This skill implements those designs.

---

## Deep Pagination

**Problem**: OFFSET scans and discards rows — slow for large offsets.

```sql
-- ❌ Slow
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 100000;

-- ✅ Cursor pagination
SELECT id, title, created_at FROM posts
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

CREATE INDEX posts_cursor_idx ON posts(created_at DESC, id DESC);
```

**Pitfall**: Can't jump to arbitrary page, only next/prev.

---

## Full-Text Search

**Problem**: `LIKE '%term%'` can't use index.

```sql
ALTER TABLE posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX posts_search_idx ON posts USING GIN(search_vector);

SELECT id, title, ts_rank(search_vector, q) AS rank
FROM posts, to_tsquery('english', 'postgres & performance') q
WHERE search_vector @@ q
ORDER BY rank DESC;
```

**Pitfall**: Use `pg_trgm` for fuzzy/typo-tolerant search instead.

---

## N+1 Query Prevention

**Solution A**: JSON aggregation

```sql
SELECT u.id, u.name,
  COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'total', o.total)) 
    FILTER (WHERE o.id IS NOT NULL), '[]') AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id = ANY(:user_ids)
GROUP BY u.id;
```

**Solution B**: LATERAL join for complex aggregation

```sql
SELECT u.*, recent.*
FROM users u
LEFT JOIN LATERAL (
  SELECT jsonb_agg(o.*) AS orders
  FROM orders o WHERE o.user_id = u.id
  ORDER BY o.created_at DESC LIMIT 5
) recent ON true;
```

---

## High-Concurrency Updates

**Problem**: Row locks cause contention on counters, queues.

**Solution A**: SKIP LOCKED for queues

```sql
UPDATE jobs SET status = 'processing', worker_id = :worker
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
) RETURNING *;
```

**Solution B**: Batched counters

```sql
-- Buffer writes
INSERT INTO view_counts_buffer (post_id, delta) VALUES (:id, 1);

-- Periodic flush
WITH deleted AS (DELETE FROM view_counts_buffer RETURNING *)
UPDATE posts p SET view_count = view_count + d.total
FROM (SELECT post_id, SUM(delta) AS total FROM deleted GROUP BY post_id) d
WHERE p.id = d.post_id;
```

**Solution C**: Advisory locks for coordination

```sql
SELECT pg_try_advisory_lock(hashtext('resource:' || :id));
-- do work
SELECT pg_advisory_unlock(hashtext('resource:' || :id));
```

---

## Zero-Downtime Migrations

### Adding NOT NULL

```sql
-- 1. Add constraint without validation (instant)
ALTER TABLE users ADD CONSTRAINT users_email_nn 
  CHECK (email IS NOT NULL) NOT VALID;

-- 2. Backfill NULLs (batched)
-- 3. Validate (scans, minimal lock)
ALTER TABLE users VALIDATE CONSTRAINT users_email_nn;

-- 4. Convert to NOT NULL (instant)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_nn;
```

### Adding Index

```sql
-- ❌ Blocks writes
CREATE INDEX idx ON users(email);

-- ✅ Non-blocking
CREATE INDEX CONCURRENTLY idx ON users(email);
```

**Pitfall**: CONCURRENTLY can fail, leaving invalid index. Check `pg_index.indisvalid`.

### Adding Foreign Key

```sql
ALTER TABLE orders ADD CONSTRAINT orders_user_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_user_fkey;
```

---

## Backfilling Large Tables

**Problem**: Single UPDATE locks table, bloats WAL.

```sql
DO $$
DECLARE batch_size INT := 5000; affected INT;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id FROM users WHERE new_col IS NULL
      LIMIT batch_size FOR UPDATE SKIP LOCKED
    )
    UPDATE users u SET new_col = compute(u.old_col)
    FROM batch b WHERE u.id = b.id;
    
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

---

## Time-Series at Scale

**Solution**: Range partitioning + BRIN index

```sql
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL,
  data JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_01 PARTITION OF events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- BRIN: tiny index for time-ordered data
CREATE INDEX events_brin ON events USING BRIN(created_at);

-- Drop old data instantly
DROP TABLE events_2023_01;
```

**Pitfall**: Queries MUST include partition key for pruning.

---

## Materialized View Caching

```sql
CREATE MATERIALIZED VIEW monthly_sales AS
SELECT date_trunc('month', created_at) AS month, product_id,
  SUM(quantity) AS qty, SUM(amount) AS total
FROM orders WHERE status = 'completed'
GROUP BY 1, 2;

CREATE UNIQUE INDEX monthly_sales_idx ON monthly_sales(month, product_id);

-- Refresh without blocking reads
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales;
```

**Pitfall**: CONCURRENTLY requires unique index.

---

## Row-Level Security (Multi-Tenant)

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::INT);

-- Set per connection
SET app.tenant = '123';
SELECT * FROM orders;  -- Auto-filtered
```

**Pitfall**: Superusers bypass RLS. Test thoroughly.

---

## Hierarchical Queries

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 1 AS depth, ARRAY[id] AS path
  FROM categories WHERE id = :root_id
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1, t.path || c.id
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10
)
SELECT * FROM tree ORDER BY path;
```

**Pitfall**: Always add depth limit. Index `parent_id`.

---

## JSONB Performance

```sql
-- General GIN (all operators)
CREATE INDEX data_gin ON products USING GIN(data);
SELECT * FROM products WHERE data @> '{"color": "red"}';

-- Expression index (specific path, smaller)
CREATE INDEX data_color ON products((data->>'color'));
SELECT * FROM products WHERE data->>'color' = 'red';
```

**Pitfall**: `->>'field'` (text) vs `->'field'` (JSON) — different!

---

## Optimistic Locking

```sql
-- Add version column
ALTER TABLE orders ADD COLUMN version INT NOT NULL DEFAULT 1;

-- Update with check
UPDATE orders SET status = 'shipped', version = version + 1
WHERE id = :id AND version = :expected;
-- affected = 0 means conflict
```

---

## Bulk Import

```sql
CREATE TEMP TABLE staging (LIKE products INCLUDING DEFAULTS);
COPY staging FROM '/path/data.csv' WITH (FORMAT csv, HEADER);

INSERT INTO products SELECT * FROM staging
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price;
```

---

## Debugging Slow Queries

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

| Symptom | Fix |
|---------|-----|
| Seq Scan large table | Add index |
| Rows estimated ≠ actual | Run ANALYZE |
| Sort external merge | Increase work_mem or add index |

---

## Connection Pooling

PostgreSQL: ~10MB RAM per connection. Use PgBouncer.

```ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

**Pitfall**: Transaction mode breaks SET, LISTEN/NOTIFY, prepared statements.

---

## Quick Reference

| Problem | Solution |
|---------|----------|
| Deep pagination | Cursor/keyset |
| Text search | tsvector + GIN |
| High concurrency | SKIP LOCKED / batching |
| Schema migration | NOT VALID + VALIDATE |
| Index on prod | CONCURRENTLY |
| Time-series | Partitioning + BRIN |
| Caching | Materialized views |
| Multi-tenant | Row-level security |
| Hierarchies | Recursive CTE |
| JSONB queries | GIN / expression index |
| Concurrent edits | Optimistic locking |
| Bulk import | COPY + staging |
