---
name: sqlite
description: SQLite implementation patterns for efficient SQL, query optimization, and safe schema changes. Focus on embedded/edge deployment. Use when writing queries, optimizing performance, or managing SQLite databases.
---

# SQLite Patterns

Write efficient, reliable SQLite code for embedded, edge, and application-local workloads.

## When to Use SQLite

| Use Case | SQLite | Client-Server |
|----------|--------|---------------|
| Embedded/mobile/desktop apps | ✅ Best | Overkill |
| Edge/IoT devices | ✅ Best | Often impossible |
| Read-heavy sites (<100K hits/day) | ✅ Good | Also good |
| High concurrency writes | ❌ Poor | ✅ Required |
| Multi-server deployment | ❌ No | ✅ Required |

---

## 1. Essential Setup

### Connection Initialization (Run Every Connection)

```sql
pragma journal_mode = WAL;      -- Better concurrency (persists)
pragma synchronous = NORMAL;    -- Safe with WAL
pragma cache_size = -64000;     -- 64MB cache
pragma foreign_keys = ON;       -- ⚠️ OFF by default, doesn't persist!
pragma busy_timeout = 5000;     -- Wait 5s for locks
pragma temp_store = MEMORY;
```

**Critical:** `foreign_keys = ON` must be set on EVERY connection!

### Type System

```sql
-- SQLite uses type affinity, not strict types
insert into users (age) values ('25');  -- Works! Stored as TEXT

-- Enable strict mode per-table (3.37+)
create table users (
    id integer primary key,
    age integer not null
) strict;
```

---

## 2. SQLite-Specific Syntax

### Primary Keys

```sql
-- INTEGER PRIMARY KEY = rowid alias (fast, recommended)
create table users (
    id integer primary key,  -- Reuses deleted IDs
    name text not null
);

-- AUTOINCREMENT = never reuse IDs (slightly slower)
create table audit_log (
    id integer primary key autoincrement,
    action text not null
);
```

**Note:** Must be `INTEGER`, not `INT` or `BIGINT`.

### UPSERT

```sql
insert into users (id, name, email)
values (1, 'Alice', 'alice@example.com')
on conflict(id) do update set
    name = excluded.name,
    email = excluded.email;
```

### RETURNING (3.35+)

```sql
insert into users (name) values ('Bob') returning id, created_at;
delete from users where id = 1 returning *;
```

### Date/Time

```sql
-- No DATE type. Use TEXT (ISO8601) or INTEGER (Unix timestamp)

-- TEXT approach (readable, sortable)
created_at text default (datetime('now'))
-- Query: where created_at > '2024-01-01'

-- INTEGER approach (compact, fast)
created_at integer default (unixepoch())
-- Query: where created_at > unixepoch('2024-01-01')

-- Functions
datetime('now')                    -- 2024-01-15 10:30:00
date('now', '-7 days')             -- 7 days ago
strftime('%Y-%m', created_at)      -- Format
unixepoch('now')                   -- Unix timestamp (3.38+)
```

---

## 3. Query Optimization

### EXPLAIN QUERY PLAN

```sql
explain query plan select * from orders where user_id = 123;
```

| Output | Meaning | Action |
|--------|---------|--------|
| `SCAN table` | Full table scan | Add index |
| `SEARCH ... USING INDEX` | Index used | Good |
| `SEARCH ... USING COVERING INDEX` | Index-only | Best |
| `USE TEMP B-TREE FOR ORDER BY` | Temp sort | Add matching index |

### Anti-Patterns

```sql
-- ❌ Function on indexed column (can't use index)
select * from users where lower(email) = 'test@example.com';
-- ✅ Expression index
create index users_email_lower_idx on users(lower(email));

-- ❌ Correlated subquery (runs for EACH row)
select *, (select count(*) from orders where user_id = users.id) from users;
-- ✅ JOIN with aggregation
select u.*, coalesce(o.cnt, 0) as order_count
from users u
left join (select user_id, count(*) as cnt from orders group by user_id) o
on o.user_id = u.id;

-- ❌ LIKE with leading wildcard
select * from products where name like '%phone%';
-- ✅ Use FTS5
select * from products_fts where products_fts match 'phone';
```

### Pagination

```sql
-- ❌ OFFSET for deep pages
select * from posts order by created_at desc limit 20 offset 100000;

-- ✅ Cursor pagination
select id, title, created_at from posts
where (created_at, id) < (:last_created_at, :last_id)
order by created_at desc, id desc
limit 20;

-- Index to support cursor pagination
create index posts_cursor_idx on posts(created_at desc, id desc);
```

### Performance Tips

```sql
-- EXISTS instead of COUNT for existence check
select exists(select 1 from orders where user_id = 1);

-- UNION ALL (no dedup) instead of UNION when duplicates OK
select id from t1 union all select id from t2;

-- Batch inserts in single transaction
begin;
insert into t values (1), (2), (3);
commit;
```

---

## 4. Indexing

### Index Types

SQLite only supports **B-tree indexes**. No GIN, GiST, or BRIN.

### Basic Indexes

```sql
-- Single column
create index users_email_idx on users(email);

-- Composite (column order matters!)
create index orders_user_created_idx on orders(user_id, created_at desc);
-- ✅ where user_id = 1
-- ✅ where user_id = 1 and created_at > '2024-01-01'
-- ❌ where created_at > '2024-01-01' (can't skip first column)
```

### Partial Indexes (3.8+)

```sql
-- Index only relevant rows
create index users_active_idx on users(email) where deleted_at is null;
create index orders_pending_idx on orders(created_at) where status = 'pending';

-- Query must include WHERE clause to use partial index
select * from users where email = ? and deleted_at is null;  -- Uses index
```

### Covering Indexes

```sql
-- Include all columns needed by query
create index orders_summary_idx on orders(user_id, status, total);

-- Index-only scan (no table lookup)
select user_id, status, sum(total) from orders where user_id = 1 group by status;
-- EXPLAIN shows: USING COVERING INDEX
```

### Expression Indexes (3.9+)

```sql
create index users_email_lower_idx on users(lower(email));
create index events_date_idx on events(date(created_at));
```

---

## 5. Full-Text Search (FTS5)

```sql
-- Create FTS table linked to source
create virtual table posts_fts using fts5(
    title, content,
    content=posts, content_rowid=id
);

-- Populate
insert into posts_fts(rowid, title, content)
select id, title, content from posts;

-- Sync triggers
create trigger posts_ai after insert on posts begin
    insert into posts_fts(rowid, title, content) values (new.id, new.title, new.content);
end;
create trigger posts_ad after delete on posts begin
    insert into posts_fts(posts_fts, rowid, title, content) values('delete', old.id, old.title, old.content);
end;
create trigger posts_au after update on posts begin
    insert into posts_fts(posts_fts, rowid, title, content) values('delete', old.id, old.title, old.content);
    insert into posts_fts(rowid, title, content) values (new.id, new.title, new.content);
end;

-- Query
select * from posts_fts where posts_fts match 'sqlite';           -- Basic
select * from posts_fts where posts_fts match '"full text"';      -- Phrase
select * from posts_fts where posts_fts match 'title:sqlite';     -- Column
select *, rank from posts_fts where posts_fts match 'sqlite' order by rank;  -- Ranked
select highlight(posts_fts, 0, '<b>', '</b>') from posts_fts where posts_fts match 'sqlite';
```

---

## 6. Schema Migrations

### ALTER TABLE Limitations

| Operation | Supported | Workaround |
|-----------|-----------|------------|
| Add column | ✅ Yes | - |
| Rename column | ✅ Yes (3.25+) | - |
| Drop column | ✅ Yes (3.35+) | Rebuild table |
| Change type | ❌ No | Rebuild table |
| Add constraint | ❌ No | Rebuild table |

### Safe Operations

```sql
-- Add nullable column
alter table users add column phone text;

-- Add column with DEFAULT (must be constant)
alter table users add column is_active integer not null default 0;
-- ❌ Can't use: default (datetime('now'))

-- Rename column (3.25+)
alter table users rename column name to full_name;

-- Drop column (3.35+)
alter table users drop column deprecated_field;
```

### Table Rebuild Pattern

For changes ALTER TABLE can't do:

```sql
pragma foreign_keys = OFF;
begin transaction;

-- 1. Create new table
create table users_new (
    id integer primary key,
    email text not null unique,  -- Added constraint
    age integer                  -- Changed type
);

-- 2. Copy data
insert into users_new (id, email, age)
select id, email, cast(age as integer) from users;

-- 3. Replace
drop table users;
alter table users_new rename to users;

-- 4. Recreate indexes, triggers, views
create index users_email_idx on users(email);

-- 5. Verify and commit
pragma foreign_key_check;
commit;
pragma foreign_keys = ON;
vacuum;
```

### Backup Before Migration

```sql
.backup main backup.db
-- Or: vacuum main into 'backup.db';
```

---

## 7. Concurrency

### Locking Model

```
Rollback mode: Single writer blocks ALL readers
WAL mode:      Single writer, readers continue (recommended)
```

### WAL Mode

```sql
pragma journal_mode = WAL;  -- Set once, persists

-- Advantages:
-- + Readers don't block writers
-- + Writers don't block readers  
-- + Better concurrent read performance

-- Considerations:
-- - Extra files: .db-wal, .db-shm
-- - All files must be on same filesystem
```

### Transactions

```sql
-- Use IMMEDIATE for writes (prevents deadlocks)
begin immediate;
update users set name = 'Alice' where id = 1;
commit;

-- DEFERRED (default) can deadlock on lock upgrade
begin;
select * from users;  -- SHARED lock
update users set name = 'Bob' where id = 2;  -- Tries EXCLUSIVE - may fail!
commit;
```

### Lock Handling

```sql
pragma busy_timeout = 5000;  -- Wait 5s instead of immediate failure
```

---

## 8. Operations

### Health Checks

```sql
pragma integrity_check;     -- Full check, returns 'ok' or errors
pragma quick_check;         -- Faster, less thorough
pragma foreign_key_check;   -- FK violations

-- Database size
select page_count * page_size as bytes from pragma_page_count(), pragma_page_size();
```

### Maintenance

```sql
vacuum;                     -- Reclaim space after deletions
reindex;                    -- Rebuild indexes
analyze;                    -- Update query planner statistics

-- FTS5 optimization
insert into posts_fts(posts_fts) values('optimize');
```

### Backup

```sql
-- Hot backup (recommended)
.backup main backup.db

-- Vacuum into new file (3.27+)
vacuum main into 'backup.db';

-- File copy: only safe if no connections, copy .db + .db-wal + .db-shm
```

### Common Issues

| Issue | Fix |
|-------|-----|
| Database locked | `busy_timeout`, shorter transactions |
| Disk image malformed | Restore backup, `.recover` |
| Slow queries | `explain query plan`, add index |
| File growing | `vacuum` |

---

## 9. Critical Rules

### Always

1. **`pragma foreign_keys = ON`** on every connection
2. **WAL mode** for concurrent access
3. **`busy_timeout`** to handle lock contention
4. **`INTEGER PRIMARY KEY`** (not INT/BIGINT) for rowid
5. **Backup before migrations**
6. **Parameterized queries** (SQL injection)

### Never

1. Assume foreign keys are enforced (OFF by default)
2. Use SQLite for high-concurrency writes (>100/sec)
3. Share SQLite over network filesystem (corruption)
4. Use OFFSET for deep pagination
5. Modify .db while .db-wal/.db-shm exist without proper handling

### Choose PostgreSQL Instead When

- Multiple servers need access
- High concurrent writes
- Need JSONB operators, array types
- Need replication or point-in-time recovery

---

## SQLite vs PostgreSQL

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrency | Single writer | MVCC |
| Types | Dynamic | Strict |
| Index types | B-tree only | B-tree, GIN, GiST, BRIN |
| ALTER TABLE | Limited | Full |
| Full-text | FTS5 | tsvector/GIN |
| Deployment | Zero-config | Server process |

---

## 10. JSON Functions

```sql
-- Sample data: {"name": "Alice", "age": 30, "tags": ["a", "b"]}

-- Extract values
json_extract(data, '$.name')         -- "Alice" (JSON type)
data->>'$.name'                      -- Alice (text, 3.38+)
json_extract(data, '$.tags[0]')      -- "a"
json_extract(data, '$.address.city') -- Nested path

-- Query with JSON
select * from users where json_extract(data, '$.age') > 25;
create index users_age_idx on users(json_extract(data, '$.age'));

-- Iterate arrays/objects
select value from json_each('["a", "b", "c"]');   -- Expands to rows
select key, value from json_each(data);           -- Key-value pairs

-- Find users with specific tag
select u.* from users u, json_each(u.data, '$.tags') t
where t.value = 'premium';

-- Build JSON
json_object('name', name, 'email', email)  -- {"name": "...", "email": "..."}
json_array(1, 2, 'three')                  -- [1, 2, "three"]

-- Aggregate to JSON
json_group_array(name)         -- ["Alice", "Bob"] from multiple rows
json_group_object(id, name)    -- {"1": "Alice", "2": "Bob"}

-- Modify JSON
json_set('{"a": 1}', '$.b', 2)      -- {"a": 1, "b": 2}
json_remove('{"a": 1}', '$.a')      -- {}
update users set data = json_set(data, '$.verified', true) where id = 1;
```

---

## Related Skills

- Data modeling: `data-modeling`
