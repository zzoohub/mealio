# SQLite Pattern Implementations

DDL and implementation details for patterns. For concepts and decision guides, see PATTERNS.md.

**Important**: SQLite has significant limitations compared to PostgreSQL. This file includes workarounds.

---

## Critical Setup (Every Connection)

```sql
PRAGMA foreign_keys = ON;       -- ⚠️ OFF by default!
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

---

## Soft Delete

### Basic Setup

```sql
ALTER TABLE users ADD COLUMN deleted_at TEXT DEFAULT NULL;

CREATE INDEX users_active_idx ON users(id) WHERE deleted_at IS NULL;
```

### Unique Constraint with Soft Delete

**Option A: Partial unique index** (SQLite 3.8+, recommended)

```sql
CREATE UNIQUE INDEX users_email_active_idx 
  ON users(email) 
  WHERE deleted_at IS NULL;
```

**Option B: Anonymize on delete**

```sql
UPDATE users SET 
  email = 'deleted-' || id || '-' || strftime('%s', 'now') || '@removed.local',
  deleted_at = datetime('now')
WHERE id = :id;
```

### Cascading Soft Delete

SQLite triggers are more limited than PostgreSQL:

```sql
CREATE TRIGGER user_soft_delete
  AFTER UPDATE OF deleted_at ON users
  WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  UPDATE orders SET deleted_at = NEW.deleted_at 
  WHERE user_id = NEW.id AND deleted_at IS NULL;
END;
```

---

## Audit Trail

### Level 2: Actor Tracking

```sql
-- Add columns (may require table rebuild for NOT NULL)
ALTER TABLE orders ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- SQLite has no session variables, so application must pass user_id
-- Trigger for updated_at only
CREATE TRIGGER orders_updated_at
  AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

### Level 3: History Table

```sql
CREATE TABLE orders_history (
  history_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  
  -- Snapshot all columns
  user_id INTEGER,
  status TEXT,
  total REAL,
  
  -- Audit metadata
  version INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by INTEGER
);

CREATE INDEX orders_history_lookup_idx 
  ON orders_history(order_id, version DESC);

-- Insert trigger
CREATE TRIGGER orders_audit_insert
  AFTER INSERT ON orders
BEGIN
  INSERT INTO orders_history 
    (order_id, user_id, status, total, version, operation)
  VALUES 
    (NEW.id, NEW.user_id, NEW.status, NEW.total, 1, 'INSERT');
END;

-- Update trigger
CREATE TRIGGER orders_audit_update
  AFTER UPDATE ON orders
BEGIN
  INSERT INTO orders_history 
    (order_id, user_id, status, total, version, operation)
  SELECT 
    NEW.id, NEW.user_id, NEW.status, NEW.total,
    COALESCE(MAX(version), 0) + 1, 'UPDATE'
  FROM orders_history WHERE order_id = NEW.id;
END;

-- Delete trigger
CREATE TRIGGER orders_audit_delete
  AFTER DELETE ON orders
BEGIN
  INSERT INTO orders_history 
    (order_id, user_id, status, total, version, operation)
  SELECT 
    OLD.id, OLD.user_id, OLD.status, OLD.total,
    COALESCE(MAX(version), 0) + 1, 'DELETE'
  FROM orders_history WHERE order_id = OLD.id;
END;
```

---

## Hierarchical Data

### Adjacency List

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL
);

CREATE INDEX categories_parent_idx ON categories(parent_id);

-- Query descendants (recursive CTE, SQLite 3.8.3+)
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM categories WHERE id = :root_id
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1
  FROM categories c 
  JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10  -- Always limit depth!
)
SELECT * FROM tree;
```

### Materialized Path

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL,  -- '/1/5/12/'
  name TEXT NOT NULL
);

CREATE INDEX categories_path_idx ON categories(path);

-- Query descendants
SELECT * FROM categories WHERE path LIKE '/1/5/%';

-- Insert with path (application must handle sequence)
INSERT INTO categories (path, name)
VALUES (:parent_path || :new_id || '/', :name);

-- Move subtree
UPDATE categories 
SET path = :new_parent_path || :node_id || '/' || 
           substr(path, length(:old_path) + 1)
WHERE path LIKE :old_path || '%';
```

### Closure Table

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE category_closure (
  ancestor_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  descendant_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX closure_descendant_idx ON category_closure(descendant_id);

-- Insert new node (application handles this)
-- 1. Insert category
-- 2. Insert self-reference: (new_id, new_id, 0)
-- 3. Copy parent's ancestors with depth + 1

-- Query descendants
SELECT c.* FROM categories c
JOIN category_closure cc ON c.id = cc.descendant_id
WHERE cc.ancestor_id = :node_id AND cc.depth > 0;
```

---

## Polymorphic Associations

### Type + ID

```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  commentable_type TEXT NOT NULL CHECK (commentable_type IN ('post', 'product')),
  commentable_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX comments_poly_idx ON comments(commentable_type, commentable_id);
```

### Separate FK Columns

```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  product_id INTEGER REFERENCES products(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- SQLite CHECK for exactly one non-null
  CHECK (
    (post_id IS NOT NULL AND product_id IS NULL) OR
    (post_id IS NULL AND product_id IS NOT NULL)
  )
);

CREATE INDEX comments_post_idx ON comments(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX comments_product_idx ON comments(product_id) WHERE product_id IS NOT NULL;
```

### Intermediate Entity

```sql
CREATE TABLE commentables (
  id INTEGER PRIMARY KEY
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  commentable_id INTEGER UNIQUE NOT NULL REFERENCES commentables(id),
  title TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  commentable_id INTEGER UNIQUE NOT NULL REFERENCES commentables(id),
  name TEXT NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  commentable_id INTEGER NOT NULL REFERENCES commentables(id),
  body TEXT NOT NULL
);
```

---

## State Machine

**Note**: SQLite has no ENUM type. Use TEXT with CHECK.

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  status_changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transition validation trigger
CREATE TRIGGER order_status_transition
  BEFORE UPDATE OF status ON orders
  WHEN OLD.status != NEW.status
BEGIN
  SELECT RAISE(ABORT, 'Invalid status transition')
  WHERE NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('shipped', 'cancelled')) OR
    (OLD.status = 'shipped' AND NEW.status = 'delivered')
  );
END;

-- Update timestamp on status change
CREATE TRIGGER order_status_timestamp
  AFTER UPDATE OF status ON orders
  WHEN OLD.status != NEW.status
BEGIN
  UPDATE orders SET status_changed_at = datetime('now') WHERE id = NEW.id;
END;

-- Status history
CREATE TABLE order_status_history (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by INTEGER REFERENCES users(id),
  reason TEXT
);
```

---

## Temporal Data

**Note**: SQLite has no EXCLUDE constraint. Must validate in application or trigger.

```sql
CREATE TABLE prices (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  amount REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT  -- NULL = current
);

CREATE INDEX prices_lookup_idx ON prices(product_id, effective_from);

-- Overlap prevention trigger
CREATE TRIGGER prices_no_overlap
  BEFORE INSERT ON prices
BEGIN
  SELECT RAISE(ABORT, 'Overlapping price period')
  WHERE EXISTS (
    SELECT 1 FROM prices
    WHERE product_id = NEW.product_id
      AND effective_from < COALESCE(NEW.effective_to, '9999-12-31')
      AND COALESCE(effective_to, '9999-12-31') > NEW.effective_from
  );
END;

-- Current price
SELECT * FROM prices 
WHERE product_id = :id 
  AND effective_from <= datetime('now') 
  AND (effective_to IS NULL OR effective_to > datetime('now'));

-- Price at specific date
SELECT * FROM prices
WHERE product_id = :id
  AND effective_from <= :date
  AND (effective_to IS NULL OR effective_to > :date);
```

---

## Multi-Tenancy

**Note**: SQLite has no Row-Level Security. Must enforce in application.

```sql
-- Add tenant_id to all tables
ALTER TABLE orders ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id);

-- Composite indexes with tenant_id first
CREATE INDEX orders_tenant_user_idx ON orders(tenant_id, user_id);

-- Unique constraints include tenant_id
CREATE UNIQUE INDEX orders_number_tenant_idx ON orders(tenant_id, order_number);

-- ⚠️ Application MUST filter by tenant_id in every query
-- Consider using a query builder that auto-adds tenant filter
```

---

## ID Strategy

### Auto-increment (INTEGER PRIMARY KEY)

```sql
-- INTEGER PRIMARY KEY is automatically auto-increment in SQLite
CREATE TABLE users (
  id INTEGER PRIMARY KEY,  -- Auto-increment
  email TEXT NOT NULL
);
```

### UUID

SQLite has no native UUID. Generate in application.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY CHECK(length(id) = 36),  -- UUID as TEXT
  email TEXT NOT NULL
);

-- Application generates UUID before insert
INSERT INTO users (id, email) VALUES (:uuid, :email);
```

### Alternative: BLOB for UUID (16 bytes vs 36)

```sql
CREATE TABLE users (
  id BLOB PRIMARY KEY CHECK(length(id) = 16),
  email TEXT NOT NULL
);

-- Store as binary, convert in application
```

---

## SQLite Limitations Summary

| Feature | PostgreSQL | SQLite | Workaround |
|---------|------------|--------|------------|
| ENUM types | ✅ | ❌ | TEXT + CHECK |
| Row-Level Security | ✅ | ❌ | Application filter |
| EXCLUDE constraint | ✅ | ❌ | Trigger validation |
| Session variables | ✅ | ❌ | Pass in application |
| ALTER ADD NOT NULL | ✅ | ❌ | Table rebuild |
| Native UUID | ✅ | ❌ | TEXT or BLOB |
| Partial index | ✅ | ✅ (3.8+) | — |
| Recursive CTE | ✅ | ✅ (3.8.3+) | — |
