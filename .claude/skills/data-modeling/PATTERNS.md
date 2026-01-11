# Pattern Implementation Details

Implementation specifics for patterns. For when/why to use each pattern, see SKILL.md.

---

## Soft Delete Implementation

### Unique Constraint Problem

**Problem**: `email` unique, but deleted user blocks new signup.

**Solutions**:

1. **Partial unique index** (recommended)
```sql
-- PostgreSQL
CREATE UNIQUE INDEX users_email_active_idx ON users(email) WHERE deleted_at IS NULL;

-- SQLite (3.8+)
CREATE UNIQUE INDEX users_email_active_idx ON users(email) WHERE deleted_at IS NULL;
```

2. **Composite unique with sentinel**
```sql
-- Use epoch 0 as "not deleted" sentinel
deleted_at DEFAULT '1970-01-01'
UNIQUE(email, deleted_at)
```

3. **Anonymize on delete**
```sql
UPDATE users SET 
  email = 'deleted-' || id || '@removed.local',
  deleted_at = NOW()
WHERE id = :id;
```

### Cascading Soft Deletes

```sql
-- Trigger to cascade soft delete to children
CREATE FUNCTION cascade_soft_delete() RETURNS TRIGGER AS $$
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

### Restoration Checklist

- [ ] Set `deleted_at = NULL`
- [ ] Check for uniqueness conflicts created while deleted
- [ ] Decide: restore children too?
- [ ] Re-validate any business rules

---

## Audit Trail Implementation

### Level 2: Actor Tracking

```sql
-- Columns to add
created_by BIGINT REFERENCES users(id),
updated_by BIGINT REFERENCES users(id)

-- Application must pass current_user_id on every write
```

### Level 3: History Table

```sql
CREATE TABLE orders_history (
  history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  
  -- Snapshot of all order columns
  user_id BIGINT,
  status TEXT,
  total NUMERIC,
  
  -- Audit metadata
  version INT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by BIGINT REFERENCES users(id)
);

CREATE INDEX orders_history_order_idx ON orders_history(order_id, version);
```

**Trigger-based capture**:

```sql
CREATE FUNCTION audit_orders() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO orders_history (order_id, user_id, status, total, version, operation, changed_by)
    VALUES (OLD.id, OLD.user_id, OLD.status, OLD.total, OLD.version, 'DELETE', current_setting('app.user_id')::BIGINT);
    RETURN OLD;
  ELSE
    INSERT INTO orders_history (order_id, user_id, status, total, version, operation, changed_by)
    VALUES (NEW.id, NEW.user_id, NEW.status, NEW.total, NEW.version, TG_OP, current_setting('app.user_id')::BIGINT);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_orders();
```

### Level 4: Change Details (JSON diff)

```sql
-- Add to history table
changes JSONB  -- {"status": ["pending", "shipped"], "total": [100, 120]}

-- In trigger, compute diff
changes = jsonb_build_object(
  'status', jsonb_build_array(OLD.status, NEW.status),
  'total', jsonb_build_array(OLD.total, NEW.total)
) WHERE OLD.status != NEW.status OR OLD.total != NEW.total;
```

---

## Hierarchical Data Implementation

### Adjacency List

```sql
CREATE TABLE categories (
  id BIGINT PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id),
  name TEXT NOT NULL
);
CREATE INDEX categories_parent_idx ON categories(parent_id);
```

### Materialized Path

```sql
CREATE TABLE categories (
  id BIGINT PRIMARY KEY,
  path TEXT NOT NULL,  -- '/1/5/12/'
  -- PostgreSQL: computed column
  depth INT GENERATED ALWAYS AS (
    array_length(string_to_array(trim(path, '/'), '/'), 1)
  ) STORED,
  -- SQLite/others: compute in application or trigger
  name TEXT NOT NULL
);

CREATE INDEX categories_path_idx ON categories(path text_pattern_ops);

-- Query descendants
SELECT * FROM categories WHERE path LIKE '/1/5/%';

-- Query ancestors (parse path in application or use string functions)
```

**Insert with path computation**:
```sql
INSERT INTO categories (id, path, name)
SELECT :new_id, parent.path || :new_id || '/', :name
FROM categories parent WHERE parent.id = :parent_id;
```

**Move subtree** (update all descendants):
```sql
UPDATE categories 
SET path = :new_parent_path || :node_id || '/' || 
           substring(path FROM length(:old_path) + 1)
WHERE path LIKE :old_path || '%';
```

### Closure Table

```sql
CREATE TABLE categories (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE category_closure (
  ancestor_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  descendant_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  depth INT NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX closure_descendant_idx ON category_closure(descendant_id);
```

**Insert new node**:
```sql
-- Self-reference
INSERT INTO category_closure (ancestor_id, descendant_id, depth)
VALUES (:new_id, :new_id, 0);

-- Copy parent's ancestors, increment depth
INSERT INTO category_closure (ancestor_id, descendant_id, depth)
SELECT ancestor_id, :new_id, depth + 1
FROM category_closure
WHERE descendant_id = :parent_id;
```

**Query descendants**:
```sql
SELECT c.* FROM categories c
JOIN category_closure cc ON c.id = cc.descendant_id
WHERE cc.ancestor_id = :node_id AND cc.depth > 0;
```

**Query ancestors**:
```sql
SELECT c.* FROM categories c
JOIN category_closure cc ON c.id = cc.ancestor_id
WHERE cc.descendant_id = :node_id AND cc.depth > 0;
```

---

## Polymorphic Association Implementation

### Pattern 1: Type + ID (No FK)

```sql
CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  commentable_type TEXT NOT NULL CHECK (commentable_type IN ('post', 'product')),
  commentable_id BIGINT NOT NULL,
  body TEXT NOT NULL
);

CREATE INDEX comments_poly_idx ON comments(commentable_type, commentable_id);
```

### Pattern 2: Separate FK Columns

```sql
CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id),
  product_id BIGINT REFERENCES products(id),
  body TEXT NOT NULL,
  
  CONSTRAINT exactly_one_parent CHECK (
    (post_id IS NOT NULL)::INT + (product_id IS NOT NULL)::INT = 1
  )
);

CREATE INDEX comments_post_idx ON comments(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX comments_product_idx ON comments(product_id) WHERE product_id IS NOT NULL;
```

### Pattern 3: Intermediate Entity

```sql
CREATE TABLE commentables (
  id BIGINT PRIMARY KEY
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  commentable_id BIGINT UNIQUE NOT NULL REFERENCES commentables(id),
  title TEXT
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  commentable_id BIGINT UNIQUE NOT NULL REFERENCES commentables(id),
  name TEXT
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  commentable_id BIGINT NOT NULL REFERENCES commentables(id),
  body TEXT NOT NULL
);

-- Must create commentable first, then post/product
```

---

## State Machine Implementation

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transition validation trigger
CREATE FUNCTION validate_order_transition() RETURNS TRIGGER AS $$
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
  
  IF NOT (valid_transitions->OLD.status) ? NEW.status THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  NEW.status_changed_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_transition();
```

### Status History

```sql
CREATE TABLE order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by BIGINT REFERENCES users(id),
  reason TEXT
);
```

---

## Temporal Data Implementation

### Effective Dating

```sql
CREATE TABLE prices (
  id BIGINT PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  amount NUMERIC NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,  -- NULL = current
  
  -- PostgreSQL only: prevent overlapping periods
  EXCLUDE USING gist (
    product_id WITH =,
    tstzrange(effective_from, effective_to, '[)') WITH &&
  )
  -- SQLite/others: enforce via application or trigger
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

## Multi-Tenancy Implementation

### Shared Schema Checklist

```sql
-- Every table needs tenant_id
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  -- ... other columns
);

-- Composite indexes with tenant_id first
CREATE INDEX orders_tenant_user_idx ON orders(tenant_id, user_id);

-- Unique constraints include tenant_id
CREATE UNIQUE INDEX orders_number_tenant_idx ON orders(tenant_id, order_number);
```

### Application Middleware Pattern

```python
# Every query must include tenant filter
class TenantMiddleware:
    def before_query(self, query):
        if not query.has_tenant_filter():
            raise SecurityError("Missing tenant filter")
```

### Row-Level Security (PostgreSQL)

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::BIGINT);

-- Force RLS for table owner too
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Set tenant context per connection
SET app.tenant_id = '123';
```
