---
name: postgresql
description: PostgreSQL implementation patterns for efficient SQL, query optimization, indexing, and safe migrations. Focus on performance, scalability, and production readiness.
---

# PostgreSQL Patterns

Write efficient, maintainable PostgreSQL code optimized for production workloads.

## When to Use This Skill

- Writing SQL queries beyond basic CRUD
- Optimizing slow queries
- Designing indexing strategies
- Planning safe database migrations
- Production database operations

---

## 1. SQL Conventions

### Naming

```sql
-- Tables: plural, snake_case
users, order_items, product_categories

-- Columns: singular, snake_case  
user_id, created_at, is_active

-- Indexes: table_columns_idx
users_email_idx, orders_user_id_created_at_idx

-- Constraints
users_email_key (UNIQUE), orders_user_id_fkey (FK), products_price_check (CHECK)
```

### Query Formatting

```sql
-- Complex queries: structured
select
    u.id,
    u.name,
    count(o.id) as order_count,
    sum(o.total) as total_spent
from users as u
left join orders as o on o.user_id = u.id
where u.is_active = true
    and u.created_at >= '2024-01-01'
group by u.id, u.name
having count(o.id) > 0
order by total_spent desc
limit 20;
```

### CTEs for Readability

```sql
with active_users as (
    select id, name from users where is_active = true
),
user_orders as (
    select user_id, count(*) as order_count, sum(total) as total_spent
    from orders where status = 'completed'
    group by user_id
)
select au.*, coalesce(uo.order_count, 0), coalesce(uo.total_spent, 0)
from active_users au
left join user_orders uo on uo.user_id = au.id;
```

---

## 2. Query Optimization

### EXPLAIN ANALYZE

```sql
explain (analyze, buffers, format text)
select * from orders where user_id = 123;
```

| Output | Meaning | Action |
|--------|---------|--------|
| Seq Scan (large table) | Full scan | Add index |
| Index Scan | Good | - |
| Index Only Scan | Best | - |
| Nested Loop (large) | Slow | Consider Hash Join |
| Sort (on-disk) | Memory exceeded | Increase work_mem or add index |
| Rows: estimated ≠ actual | Stale stats | Run ANALYZE |

### Anti-Patterns

```sql
-- ❌ Function on indexed column
select * from users where lower(email) = 'test@example.com';
-- ✅ Expression index
create index users_email_lower_idx on users(lower(email));

-- ❌ SELECT *
select * from users where id = 1;
-- ✅ Select needed columns (enables Index Only Scan)
select id, name, email from users where id = 1;

-- ❌ NOT IN with subquery
select * from users where id not in (select user_id from banned);
-- ✅ NOT EXISTS
select * from users u where not exists (select 1 from banned b where b.user_id = u.id);

-- ❌ LIKE with leading wildcard
select * from products where name like '%phone%';
-- ✅ Full-text search
create index products_search_idx on products using gin(to_tsvector('english', name));
select * from products where to_tsvector('english', name) @@ to_tsquery('phone');
```

### N+1 Prevention

```sql
-- ❌ Loop queries
-- for user in users: query("select * from orders where user_id = ?", user.id)

-- ✅ Single query with JOIN
select u.id, u.name, o.id as order_id, o.total
from users u
left join orders o on o.user_id = u.id
where u.id = any(array[1, 2, 3, 4, 5]);

-- ✅ JSON aggregation
select u.id, u.name,
    coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'total', o.total)) 
             filter (where o.id is not null), '[]') as orders
from users u
left join orders o on o.user_id = u.id
where u.id = any(array[1, 2, 3, 4, 5])
group by u.id;
```

### Pagination

```sql
-- ❌ OFFSET (slow for deep pages)
select * from posts order by created_at desc limit 20 offset 100000;

-- ✅ Cursor pagination
select id, title, created_at from posts
where (created_at, id) < ('2024-01-15 10:30:00+00', 12345)
order by created_at desc, id desc
limit 20;

-- Required index
create index posts_cursor_idx on posts(created_at desc, id desc);
```

### Efficient Counting

```sql
-- Estimate (instant)
select reltuples::bigint from pg_class where relname = 'posts';

-- Bounded count ("has more?")
select count(*) from (select 1 from posts where status = 'published' limit 10001) t;
```

---

## 3. Indexing

### Index Types

| Type | Use Case |
|------|----------|
| **B-tree** | Equality, range, sorting (default) |
| **GIN** | Arrays, JSONB, full-text |
| **GiST** | Geometric, range types |
| **BRIN** | Large ordered tables (time-series) |

### B-tree Patterns

```sql
-- Composite index (column order matters!)
create index orders_user_created_idx on orders(user_id, created_at desc);

-- Supports:
-- ✅ where user_id = 1
-- ✅ where user_id = 1 and created_at > '2024-01-01'
-- ✅ where user_id = 1 order by created_at desc
-- ❌ where created_at > '2024-01-01' (can't skip first column)
```

### Partial Indexes

```sql
create index orders_pending_idx on orders(created_at) where status = 'pending';
create index users_active_idx on users(email) where deleted_at is null;
```

### Covering Indexes (INCLUDE)

```sql
create index users_email_idx on users(email) include (id, name, avatar_url);
-- Enables Index Only Scan for: select id, name, avatar_url from users where email = ?
```

### GIN for JSONB

```sql
create index products_data_idx on products using gin(data);
-- Supports: data @> '{"color": "red"}', data ? 'color'

-- Specific path (smaller, faster)
create index products_color_idx on products using gin((data->'color'));
```

### Index Maintenance

```sql
-- Unused indexes
select indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
from pg_stat_user_indexes
where idx_scan = 0 and indisunique is false
order by pg_relation_size(indexrelid) desc;

-- Rebuild bloated index
reindex index concurrently users_email_idx;
```

---

## 4. Safe Migrations

### Risk Assessment

| Operation | Lock | Risk |
|-----------|------|------|
| Add nullable column | Brief | Low |
| Add column with default (PG11+) | Brief | Low |
| Add NOT NULL (existing) | ACCESS EXCLUSIVE | High |
| Create index | SHARE | Medium |
| Create index CONCURRENTLY | None | Low |
| Add foreign key | SHARE ROW EXCLUSIVE | High |
| Change column type | ACCESS EXCLUSIVE | Very High |

### Safe Index Creation

```sql
-- ❌ Blocks writes
create index users_email_idx on users(email);

-- ✅ Concurrent (allows reads/writes)
create index concurrently users_email_idx on users(email);
```

### Adding NOT NULL Safely

```sql
-- 1. Add check constraint (instant)
alter table users add constraint users_email_not_null check (email is not null) not valid;

-- 2. Validate (scans, minimal locking)
alter table users validate constraint users_email_not_null;

-- 3. Convert to NOT NULL (instant)
alter table users alter column email set not null;
alter table users drop constraint users_email_not_null;
```

### Adding Foreign Key Safely

```sql
-- 1. Add NOT VALID (instant)
alter table orders add constraint orders_user_fkey 
    foreign key (user_id) references users(id) not valid;

-- 2. Validate (scans, minimal locking)
alter table orders validate constraint orders_user_fkey;
```

### Backfilling Large Tables

```sql
-- ❌ Single update (locks table)
update users set new_col = old_col;

-- ✅ Batched
do $$
declare
    batch_size int := 5000;
begin
    loop
        with batch as (
            select id from users where new_col is null limit batch_size for update skip locked
        )
        update users set new_col = old_col where id in (select id from batch);
        
        exit when not found;
        commit;
        perform pg_sleep(0.1);
    end loop;
end $$;
```

---

## 5. Partitioning

### When to Partition

- Table > 100GB or > 100M rows
- Queries always filter by partition key (date, tenant_id)
- Need to drop old data efficiently
- Maintenance (VACUUM) taking too long

### Range Partitioning (Time-Series)

```sql
create table events (
    id bigint generated always as identity,
    created_at timestamptz not null,
    data jsonb
) partition by range (created_at);

-- Create partitions
create table events_2024_01 partition of events
    for values from ('2024-01-01') to ('2024-02-01');
create table events_2024_02 partition of events
    for values from ('2024-02-01') to ('2024-03-01');

-- Auto-create with pg_partman (recommended)
-- Or cron job to create future partitions

-- Drop old data (instant, no vacuum needed)
drop table events_2023_01;
```

### List Partitioning (Multi-Tenant)

```sql
create table orders (
    id bigint, tenant_id int not null, total numeric
) partition by list (tenant_id);

create table orders_tenant_1 partition of orders for values in (1);
create table orders_tenant_2 partition of orders for values in (2);
create table orders_default partition of orders default;
```

### Partition Tips

```sql
-- Always include partition key in queries
select * from events where created_at >= '2024-01-01' and created_at < '2024-02-01';

-- Index each partition (auto-created if defined on parent)
create index on events (created_at);

-- Check partition pruning
explain select * from events where created_at = '2024-01-15';
-- Should show only events_2024_01 scanned
```

---

## 6. Connection Pooling

### Why Pool Connections

- PostgreSQL: 1 process per connection (~10MB RAM each)
- Works well: < 100 connections
- Problems: > 300 connections (context switching, RAM)
- Solution: PgBouncer, pgpool, or application-level pooling

### PgBouncer Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Transaction** | Conn returned after each transaction | Most apps (recommended) |
| **Session** | Conn held for entire session | Session variables, prepared statements |
| **Statement** | Conn returned after each statement | Simple queries only |

### PgBouncer Config

```ini
[databases]
mydb = host=localhost dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000      # Clients connecting to PgBouncer
default_pool_size = 20      # Connections to PostgreSQL per pool
reserve_pool_size = 5       # Extra connections for burst
```

### Application Guidelines

```sql
-- Transaction mode limitations:
-- ❌ SET statements (use per-query: set_config())
-- ❌ LISTEN/NOTIFY
-- ❌ Named prepared statements (use unnamed or set prepared_statements = no)
-- ❌ Session-level advisory locks

-- Works fine:
-- ✅ Regular queries
-- ✅ Transactions
-- ✅ Temp tables (within transaction)
```

---

## 7. Production Operations

### Connection Monitoring

```sql
-- Connections by state
select state, count(*) from pg_stat_activity group by state;

-- Long-running queries
select pid, now() - query_start as duration, state, query
from pg_stat_activity
where state != 'idle' and query_start < now() - interval '5 minutes';

-- Kill connection
select pg_terminate_backend(12345);
```

### Lock Monitoring

```sql
-- Blocking locks
select blocked.pid, blocked.query, blocking.pid as blocking_pid, blocking.query as blocking_query
from pg_stat_activity blocked
join pg_locks bl on blocked.pid = bl.pid
join pg_locks bg on bl.relation = bg.relation and bl.pid != bg.pid
join pg_stat_activity blocking on bg.pid = blocking.pid
where not bl.granted;

-- Set timeouts
set statement_timeout = '30s';
set lock_timeout = '10s';
```

### Maintenance

```sql
-- Tables needing vacuum
select schemaname || '.' || relname, n_dead_tup, last_autovacuum
from pg_stat_user_tables
where n_dead_tup > 10000
order by n_dead_tup desc;

-- Cache hit ratio (should be > 99%)
select sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0) as ratio
from pg_statio_user_tables;

-- Slow queries (requires pg_stat_statements)
select query, calls, mean_exec_time, total_exec_time
from pg_stat_statements
order by total_exec_time desc limit 10;
```

---

## 8. Critical Rules

### Always

1. **Index all foreign keys**
2. **Use TIMESTAMPTZ** (not TIMESTAMP)
3. **Use TEXT** (not VARCHAR without limit)
4. **Use BIGINT for IDs**
5. **Use CONCURRENTLY for production indexes**
6. **Test migrations on production-size data**

### Never

1. **OFFSET for deep pagination** → cursor pagination
2. **Add NOT NULL without checking data** → migration fails
3. **Change column type without planning** → rewrites table
4. **Skip statement_timeout in production**
5. **Trust ORM-generated queries** → check EXPLAIN

---

## Related Skills

- Data modeling: `data-modeling`
