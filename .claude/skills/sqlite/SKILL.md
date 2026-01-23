---
name: sqlite
description: |
  SQLite problem-solving patterns for embedded/edge deployments.
  Use when: connection setup, "database locked" errors, ALTER TABLE workarounds, concurrency problems, FTS setup, SQLite-specific gotchas.
  Do not use for: basic DDL/DML syntax (use context7), schema design decisions (use data-modeling skill first).
  Workflow: data-modeling skill (design) → this skill (implement).
  Decision: If asking "should I use PostgreSQL instead?" — see comparison section at bottom.
---

# SQLite Patterns

For basic DDL/DML syntax, use context7. This skill focuses on **SQLite-specific problems and solutions**.

**Prerequisite**: Schema should be designed using `data-modeling` skill first. This skill implements those designs with SQLite-specific adaptations.

---

## Critical: Connection Setup

**Every connection must run these pragmas** — they don't persist:

```sql
PRAGMA journal_mode = WAL;      -- Better concurrency
PRAGMA synchronous = NORMAL;    -- Safe with WAL
PRAGMA foreign_keys = ON;       -- ⚠️ OFF by default!
PRAGMA busy_timeout = 5000;     -- Wait for locks
PRAGMA cache_size = -64000;     -- 64MB cache
```

**Most common bug**: Foreign keys silently not enforced.

---

## "Database is Locked" Errors

**Problem**: SQLite has single-writer model.

**Solution A**: WAL mode (readers don't block writer)

```sql
PRAGMA journal_mode = WAL;  -- Run once, persists
```

**Solution B**: IMMEDIATE transactions for writes

```sql
-- ❌ DEFERRED can deadlock
BEGIN; SELECT ...; UPDATE ...;  -- May fail on UPDATE

-- ✅ IMMEDIATE acquires lock upfront
BEGIN IMMEDIATE; SELECT ...; UPDATE ...; COMMIT;
```

**Solution C**: Retry logic in application

```python
for attempt in range(3):
    try:
        db.execute("UPDATE ...")
        break
    except sqlite3.OperationalError as e:
        if "locked" in str(e) and attempt < 2:
            time.sleep(0.1 * (attempt + 1))
        else:
            raise
```

**Pitfall**: WAL creates .db-wal, .db-shm files — must stay together.

---

## ALTER TABLE Limitations

**What SQLite can't do**:
- Add NOT NULL to existing column
- Change column type
- Add CHECK/UNIQUE constraint to existing column

**Solution**: Table rebuild

```sql
PRAGMA foreign_keys = OFF;
BEGIN;

-- 1. Create new table
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,  -- Added constraint
    age INTEGER NOT NULL DEFAULT 0
);

-- 2. Copy data
INSERT INTO users_new (id, email, age)
SELECT id, email, COALESCE(age, 0) FROM users;

-- 3. Swap
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 4. Recreate indexes
CREATE INDEX users_email_idx ON users(email);

PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys = ON;
```

**Pitfall**: Must recreate ALL indexes, triggers, views.

---

## No Native Date Type

**Solution A**: TEXT (ISO8601) — recommended

```sql
created_at TEXT DEFAULT (datetime('now'))

-- Queries work naturally
WHERE created_at > '2024-01-01'
WHERE date(created_at) = '2024-01-15'

-- Date math
datetime(created_at, '+7 days')
datetime('now', '-1 hour')
```

**Solution B**: INTEGER (Unix timestamp)

```sql
created_at INTEGER DEFAULT (unixepoch())

WHERE created_at > unixepoch('2024-01-01')
datetime(created_at, 'unixepoch')  -- Convert to readable
```

**Pitfall**: Pick ONE approach, use consistently. No timezone support — store UTC.

---

## Dynamic Typing Issues

**Problem**: SQLite accepts wrong types silently.

```sql
INSERT INTO users (age) VALUES ('not a number');  -- Works!
```

**Solution**: STRICT tables (3.37+)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    age INTEGER NOT NULL
) STRICT;

INSERT INTO users (age) VALUES ('text');  -- Error!
```

**Alternative**: CHECK constraints for older versions

```sql
age INTEGER CHECK(typeof(age) = 'integer' OR age IS NULL)
```

---

## Full-Text Search

**Problem**: LIKE '%term%' is slow.

**Solution**: FTS5

```sql
-- Create FTS table
CREATE VIRTUAL TABLE posts_fts USING fts5(
    title, content, content=posts, content_rowid=id
);

-- Sync triggers
CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
    INSERT INTO posts_fts(rowid, title, content)
    VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
    INSERT INTO posts_fts(posts_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
    INSERT INTO posts_fts(posts_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, old.content);
    INSERT INTO posts_fts(rowid, title, content)
    VALUES (new.id, new.title, new.content);
END;

-- Query
SELECT * FROM posts_fts WHERE posts_fts MATCH 'sqlite';
SELECT * FROM posts_fts WHERE posts_fts MATCH '"exact phrase"';
SELECT *, rank FROM posts_fts WHERE posts_fts MATCH 'term' ORDER BY rank;
```

**Pitfall**: Must keep FTS in sync with triggers.

---

## Hierarchical Queries

```sql
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories WHERE id = :root_id
    UNION ALL
    SELECT c.id, c.name, c.parent_id, t.depth + 1
    FROM categories c JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 10
)
SELECT * FROM tree;
```

**Pitfall**: Always add depth limit. Index `parent_id`.

---

## JSON Handling

```sql
-- Extract
json_extract(data, '$.name')
data->>'$.name'  -- 3.38+ (returns TEXT)

-- Query
SELECT * FROM products WHERE json_extract(data, '$.price') > 100;

-- Index JSON paths
CREATE INDEX idx ON products(json_extract(data, '$.price'));

-- Array iteration
SELECT * FROM products, json_each(products.data, '$.tags') AS tag
WHERE tag.value = 'sale';

-- Modify
UPDATE products SET data = json_set(data, '$.price', 29.99);

-- Aggregate
json_group_array(name)         -- ["Alice", "Bob"]
json_group_object(id, name)    -- {"1": "Alice"}
```

**Pitfall**: `->` returns JSON, `->>` returns TEXT.

---

## Partial Index Matching

**Problem**: Query must exactly match partial index condition.

```sql
CREATE INDEX idx ON orders(created_at) WHERE status = 'pending';

-- ✅ Uses index
SELECT * FROM orders WHERE status = 'pending' AND created_at > '2024-01-01';

-- ❌ Doesn't use index
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

---

## Query Optimization

```sql
EXPLAIN QUERY PLAN SELECT ...;
```

| Output | Meaning | Fix |
|--------|---------|-----|
| SCAN | Full table scan | Add index |
| SEARCH USING INDEX | Good | — |
| USE TEMP B-TREE | Sorting | Add index matching ORDER BY |

**Covering indexes** (index-only scan):

```sql
CREATE INDEX idx ON orders(user_id, status, total);
SELECT status, total FROM orders WHERE user_id = 1;  -- No table lookup
```

---

## Backup

```sql
-- Hot backup
.backup main backup.db

-- Or VACUUM INTO (3.27+)
VACUUM INTO 'backup.db';
```

**Pitfall**: Never copy .db alone in WAL mode — must include .db-wal, .db-shm.

---

## Database File Growing

**Problem**: Space not returned after deletes.

```sql
VACUUM;  -- Rebuild (slow, needs 2x disk space)

-- Or auto-vacuum
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA incremental_vacuum(1000);
```

---

## Concurrency Pattern

```python
def get_db():
    conn = sqlite3.connect('app.db')
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA busy_timeout=5000')
    return conn
```

**Architecture**:
- Multiple reader connections OK (concurrent)
- Single writer (serialize writes)
- For >100 writes/sec → use PostgreSQL

---

## SQLite vs PostgreSQL

| Scenario | SQLite | PostgreSQL |
|----------|--------|------------|
| Embedded/mobile | ✅ | ❌ |
| Single-server (<100 writes/sec) | ✅ | ✅ |
| Multi-server | ❌ | ✅ |
| High concurrent writes | ❌ | ✅ |
| Zero-config | ✅ | ❌ |

**Rule**: If asking "should I use PostgreSQL?" — probably yes.

---

## Quick Reference: SQLite Gotchas

| Problem | Solution |
|---------|----------|
| FK not enforced | `PRAGMA foreign_keys = ON` every connection |
| Database locked | WAL + busy_timeout + IMMEDIATE |
| Can't add NOT NULL | Table rebuild |
| Wrong types accepted | STRICT tables |
| File growing | VACUUM |
| Slow text search | FTS5 |
| No boolean | INTEGER 0/1 |
| Date handling | TEXT (ISO8601) or INTEGER (Unix) |
| Backup corruption | Never copy .db alone in WAL mode |
