# PostgreSQL Pattern Implementations

DDL and implementation details for patterns. For concepts and decision guides, see PATTERNS.md.

---

## Soft Delete

### Basic Setup

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX users_active_idx ON users(id) WHERE deleted_at IS NULL;
```

### Unique Constraint with Soft Delete

**Option A: Partial unique index** (recommended)

```sql
CREATE UNIQUE INDEX users_email_active_idx 
  ON users(email) 
  WHERE deleted_at IS NULL;
```

**Option B: Anonymize on delete**

```sql
UPDATE users SET 
  email = 'deleted-' || id || '-' || extract(epoch from now()) || '@removed.local',
  deleted_at = NOW()
WHERE id = :id;
```

### Cascading Soft Delete

```sql
CREATE OR REPLACE FUNCTION cascade_soft_delete() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders SET deleted_at = NEW.deleted_at 
  WHERE user_id = NEW.id AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_soft_delete
  AFTER UPDATE OF deleted_at ON users
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION cascade_soft_delete();
```

---

## Audit Trail

### Level 2: Actor Tracking

```sql
ALTER TABLE orders ADD COLUMN created_by BIGINT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN updated_by BIGINT REFERENCES users(id);

-- Application sets current_setting before each request
SET app.user_id = '123';

-- Trigger for updated_by
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = current_setting('app.user_id', true)::BIGINT;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_by
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();
```

### Level 3: History Table

```sql
CREATE TABLE orders_history (
  history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  
  -- Snapshot all columns
  user_id BIGINT,
  status TEXT,
  total NUMERIC,
  
  -- Audit metadata
  version INT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by BIGINT
);

CREATE INDEX orders_history_lookup_idx 
  ON orders_history(order_id, version DESC);

-- Trigger
CREATE OR REPLACE FUNCTION audit_orders() 
RETURNS TRIGGER AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  v_user_id := current_setting('app.user_id', true)::BIGINT;
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO orders_history 
      (order_id, user_id, status, total, version, operation, changed_by)
    VALUES 
      (OLD.id, OLD.user_id, OLD.status, OLD.total, 
       COALESCE(OLD.version, 0) + 1, 'DELETE', v_user_id);
    RETURN OLD;
  ELSE
    INSERT INTO orders_history 
      (order_id, user_id, status, total, version, operation, changed_by)
    VALUES 
      (NEW.id, NEW.user_id, NEW.status, NEW.total, 
       NEW.version, TG_OP, v_user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_orders();
```

---

## Hierarchical Data

### Adjacency List

```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id),
  name TEXT NOT NULL
);

CREATE INDEX categories_parent_idx ON categories(parent_id);

-- Query descendants (recursive CTE)
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 1 AS depth, ARRAY[id] AS path
  FROM categories WHERE id = :root_id
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1, t.path || c.id
  FROM categories c 
  JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10  -- Always limit depth!
)
SELECT * FROM tree ORDER BY path;
```

### Materialized Path

```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path TEXT NOT NULL,  -- '/1/5/12/'
  name TEXT NOT NULL
);

CREATE INDEX categories_path_idx ON categories(path text_pattern_ops);

-- Query descendants
SELECT * FROM categories WHERE path LIKE '/1/5/%';

-- Insert with path
INSERT INTO categories (path, name)
SELECT parent.path || currval('categories_id_seq') || '/', :name
FROM categories parent 
WHERE parent.id = :parent_id;

-- Move subtree
UPDATE categories 
SET path = :new_parent_path || :node_id || '/' || 
           substring(path FROM length(:old_path) + 1)
WHERE path LIKE :old_path || '%';
```

### Closure Table

```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE category_closure (
  ancestor_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  descendant_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  depth INT NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX closure_descendant_idx ON category_closure(descendant_id);

-- Insert new node
INSERT INTO categories (name) VALUES (:name) RETURNING id INTO :new_id;

-- Self-reference
INSERT INTO category_closure (ancestor_id, descendant_id, depth)
VALUES (:new_id, :new_id, 0);

-- Copy parent's ancestors
INSERT INTO category_closure (ancestor_id, descendant_id, depth)
SELECT ancestor_id, :new_id, depth + 1
FROM category_closure
WHERE descendant_id = :parent_id;

-- Query descendants
SELECT c.* FROM categories c
JOIN category_closure cc ON c.id = cc.descendant_id
WHERE cc.ancestor_id = :node_id AND cc.depth > 0;

-- Query ancestors
SELECT c.* FROM categories c
JOIN category_closure cc ON c.id = cc.ancestor_id
WHERE cc.descendant_id = :node_id AND cc.depth > 0;
```

---

## Polymorphic Associations

### Type + ID

```sql
CREATE TABLE comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commentable_type TEXT NOT NULL CHECK (commentable_type IN ('post', 'product')),
  commentable_id BIGINT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_poly_idx ON comments(commentable_type, commentable_id);
```

### Separate FK Columns

```sql
CREATE TABLE comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id),
  product_id BIGINT REFERENCES products(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT exactly_one_parent CHECK (
    num_nonnulls(post_id, product_id) = 1
  )
);

CREATE INDEX comments_post_idx ON comments(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX comments_product_idx ON comments(product_id) WHERE product_id IS NOT NULL;
```

### Intermediate Entity

```sql
CREATE TABLE commentables (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

CREATE TABLE posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commentable_id BIGINT UNIQUE NOT NULL REFERENCES commentables(id),
  title TEXT NOT NULL
);

CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commentable_id BIGINT UNIQUE NOT NULL REFERENCES commentables(id),
  name TEXT NOT NULL
);

CREATE TABLE comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commentable_id BIGINT NOT NULL REFERENCES commentables(id),
  body TEXT NOT NULL
);

-- Insert flow: create commentable first, then post/product
INSERT INTO commentables DEFAULT VALUES RETURNING id;
INSERT INTO posts (commentable_id, title) VALUES (:commentable_id, :title);
```

---

## State Machine

```sql
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
);

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status order_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transition validation
CREATE OR REPLACE FUNCTION validate_order_transition() 
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["shipped", "cancelled"],
    "shipped": ["delivered"],
    "delivered": [],
    "cancelled": []
  }';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT (valid_transitions->OLD.status::TEXT) ? NEW.status::TEXT THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  NEW.status_changed_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_transition();

-- Status history (optional)
CREATE TABLE order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  from_status order_status,
  to_status order_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by BIGINT REFERENCES users(id),
  reason TEXT
);
```

---

## Temporal Data

```sql
CREATE TABLE prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  amount NUMERIC NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,  -- NULL = current
  
  -- Prevent overlapping periods
  EXCLUDE USING gist (
    product_id WITH =,
    tstzrange(effective_from, effective_to, '[)') WITH &&
  )
);

-- Current price
SELECT * FROM prices 
WHERE product_id = :id 
  AND effective_from <= NOW() 
  AND (effective_to IS NULL OR effective_to > NOW());

-- Price at specific date
SELECT * FROM prices
WHERE product_id = :id
  AND effective_from <= :date
  AND (effective_to IS NULL OR effective_to > :date);
```

---

## Multi-Tenancy

### Shared Schema with RLS

```sql
-- Add tenant_id to all tables
ALTER TABLE orders ADD COLUMN tenant_id BIGINT NOT NULL REFERENCES tenants(id);

-- Composite indexes with tenant_id first
CREATE INDEX orders_tenant_user_idx ON orders(tenant_id, user_id);

-- Unique constraints include tenant_id
CREATE UNIQUE INDEX orders_number_tenant_idx ON orders(tenant_id, order_number);

-- Row-Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::BIGINT);

-- Force RLS even for table owner
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Set context per connection
SET app.tenant_id = '123';
SELECT * FROM orders;  -- Auto-filtered by tenant
```

---

## ID Strategy

### Auto-increment (BIGINT)

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL
);
```

### UUID v4

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL
);
```

### UUID v7 (PostgreSQL 17+ or extension)

```sql
-- If using pg_uuidv7 extension
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  email TEXT NOT NULL
);

-- Or generate in application layer
```
