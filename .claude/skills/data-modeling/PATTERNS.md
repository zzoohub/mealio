# Data Modeling Patterns

Detailed implementation guidance for common patterns.

## Soft Deletes

### Basic Pattern

```
Entity:
  - id
  - ... other columns ...
  - deleted_at (nullable timestamp)
```

### Implementation Considerations

**Querying:**
```
Active:  WHERE deleted_at IS NULL
Deleted: WHERE deleted_at IS NOT NULL
All:     No filter (admin only)
```

**Cascading Soft Deletes:**
When parent is soft-deleted, should children be soft-deleted?

| Approach | Pros | Cons |
|----------|------|------|
| Cascade soft delete | Consistent state | Complex to undo |
| Leave children | Simple | Orphan-like state |
| Application decides | Flexible | Business logic in code |

**Unique Constraints with Soft Delete:**
Problem: `email` unique, but deleted user blocks new signup with same email.

Solutions:
1. Partial unique index: `UNIQUE(email) WHERE deleted_at IS NULL`
2. Composite unique: `UNIQUE(email, deleted_at)` with sentinel value
3. Anonymize on delete: Set email to `deleted-{id}@example.com`

**Restoration:**
- Set `deleted_at = NULL`
- What about children? Restore them too?
- What about uniqueness conflicts created while deleted?

---

## Audit Trail

### Level 1: Timestamps Only

```
Entity:
  - created_at (required, immutable)
  - updated_at (required, auto-update)
```

Answers: When was it created? When last changed?

### Level 2: Timestamps + Actor

```
Entity:
  - created_at
  - created_by → users.id
  - updated_at
  - updated_by → users.id
```

Answers: Who created it? Who last changed it?

### Level 3: History Table

```
Entity:
  - id
  - ... columns ...
  - version (incrementing)

Entity_History:
  - history_id (PK)
  - entity_id (FK to Entity)
  - ... all entity columns (snapshot) ...
  - version
  - changed_at
  - changed_by
  - operation (INSERT/UPDATE/DELETE)
```

Answers: What was the value at any point in time?

**Implementation Options:**

| Method | Pros | Cons |
|--------|------|------|
| Application code | Full control | Easy to forget |
| Database triggers | Can't bypass | Harder to debug |
| CDC (Change Data Capture) | Decoupled | Infrastructure complexity |

### Level 4: Change Details

Add to history table:
```
changes: JSON
  - field_name: [old_value, new_value]
```

Answers: Exactly what changed in each update?

### Level 5: Event Sourcing

Don't store state, store events:
```
Events:
  - event_id
  - entity_type
  - entity_id
  - event_type (Created, Updated, Deleted)
  - event_data (full payload)
  - occurred_at
  - actor_id

Current state = replay all events for entity
```

Answers: Complete audit trail, can reconstruct any point in time.

**Trade-offs:**
- ✅ Perfect audit trail
- ✅ Can replay/rebuild state
- ❌ Complex queries for current state
- ❌ Storage grows indefinitely
- ❌ Requires event versioning strategy

---

## Hierarchical Data

### Pattern 1: Adjacency List

```
Category:
  - id
  - parent_id → Category.id (nullable for root)
  - name
```

**Queries:**
- Get parent: Simple JOIN
- Get children: Simple WHERE
- Get all descendants: Recursive query (CTE)
- Get all ancestors: Recursive query (CTE)

**Best for:** Simple hierarchies, frequent structure changes, shallow trees.

### Pattern 2: Materialized Path

```
Category:
  - id
  - path (e.g., "/1/5/12/")
  - depth (computed from path)
  - name
```

**Queries:**
- Get descendants: `WHERE path LIKE '/1/5/%'`
- Get ancestors: Parse path, query by IDs
- Get depth: `WHERE depth = 2`

**Maintenance:**
- Insert: Compute path from parent
- Move: Update path of node AND all descendants
- Delete: Handle descendants (delete or orphan)

**Best for:** Read-heavy, stable hierarchies, need subtree queries.

### Pattern 3: Closure Table

```
Category:
  - id
  - name

Category_Closure:
  - ancestor_id → Category.id
  - descendant_id → Category.id
  - depth (0 for self-reference)
```

Every node has entries for ALL ancestors (including self).

**Queries:**
- Get descendants: `WHERE ancestor_id = X AND depth > 0`
- Get ancestors: `WHERE descendant_id = X AND depth > 0`
- Get direct children: `WHERE ancestor_id = X AND depth = 1`

**Maintenance:**
- Insert: Copy parent's ancestor entries + add self
- Move: Delete old closure entries, create new ones
- Delete: Delete all closure entries for node

**Best for:** Balanced read/write, need both ancestor and descendant queries.

### Pattern 4: Nested Sets

```
Category:
  - id
  - lft (left boundary)
  - rgt (right boundary)
  - name
```

Tree is numbered in depth-first order.

**Queries:**
- Get descendants: `WHERE lft > parent.lft AND rgt < parent.rgt`
- Get ancestors: `WHERE lft < node.lft AND rgt > node.rgt`
- Is leaf?: `rgt = lft + 1`

**Maintenance:**
- Insert: Shift all nodes to make room (expensive!)
- Move: Complex renumbering
- Delete: Shift nodes back

**Best for:** Static hierarchies, complex tree queries, no updates.

### Decision Matrix

| Need | Adjacency | Path | Closure | Nested Sets |
|------|-----------|------|---------|-------------|
| Simple implementation | ✅ | ⚠️ | ❌ | ❌ |
| Frequent inserts | ✅ | ⚠️ | ⚠️ | ❌ |
| Frequent moves | ✅ | ❌ | ⚠️ | ❌ |
| Subtree queries | ❌ | ✅ | ✅ | ✅ |
| Ancestor queries | ❌ | ⚠️ | ✅ | ✅ |
| Deep trees (>10 levels) | ⚠️ | ✅ | ✅ | ⚠️ |

---

## Polymorphic Associations

### Pattern 1: Type + ID Columns

```
Comment:
  - id
  - commentable_type ("post", "product", "article")
  - commentable_id
  - body
```

**Queries:**
- Get comments for post: `WHERE commentable_type = 'post' AND commentable_id = ?`
- Get all user comments: `WHERE user_id = ?`

**Constraints:**
- ❌ No FK constraint possible
- ❌ Type column can have invalid values
- ⚠️ Index on (type, id) helps performance

### Pattern 2: Separate FK Columns

```
Comment:
  - id
  - post_id → Post.id (nullable)
  - product_id → Product.id (nullable)
  - article_id → Article.id (nullable)
  - body
  
  CHECK: exactly one of post_id, product_id, article_id is NOT NULL
```

**Pros:**
- ✅ FK constraints work
- ✅ JOINs are straightforward

**Cons:**
- ❌ Many nullable columns
- ❌ Check constraint complexity
- ❌ Schema change for new types

### Pattern 3: Separate Tables

```
PostComment:
  - id
  - post_id → Post.id
  - body

ProductComment:
  - id  
  - product_id → Product.id
  - body
```

**Pros:**
- ✅ Full referential integrity
- ✅ Clean schema per type

**Cons:**
- ❌ Duplicate structure
- ❌ "All comments" query requires UNION
- ❌ New entity type = new table

### Pattern 4: Intermediate Entity

```
Commentable:
  - id

Post:
  - id
  - commentable_id → Commentable.id

Product:
  - id
  - commentable_id → Commentable.id

Comment:
  - id
  - commentable_id → Commentable.id
  - body
```

**Pros:**
- ✅ FK constraints work
- ✅ Single comments table
- ✅ Easy to add new types

**Cons:**
- ❌ Extra table and JOIN
- ❌ Must create Commentable for every Post/Product

### Decision Guide

| Priority | Pattern |
|----------|---------|
| Maximum flexibility, okay with app-level integrity | Type + ID |
| Need FK constraints, few types | Separate FK columns |
| Need FK constraints, types differ significantly | Separate tables |
| Need FK constraints, many similar types | Intermediate entity |

---

## State Machines

### Pattern: Status Column with Transitions

```
Order:
  - id
  - status ("pending", "confirmed", "shipped", "delivered", "cancelled")
  - status_changed_at
```

**Define Valid Transitions:**
```
pending → confirmed, cancelled
confirmed → shipped, cancelled
shipped → delivered
delivered → (terminal)
cancelled → (terminal)
```

**Implementation:**
- Application code validates transitions
- Consider trigger if critical
- Log all transitions for audit

### Pattern: Status History Table

```
Order:
  - id
  - current_status

OrderStatusHistory:
  - id
  - order_id → Order.id
  - from_status (nullable for initial)
  - to_status
  - changed_at
  - changed_by
  - reason (optional)
```

**Benefits:**
- Full history of state changes
- When and who changed it
- Can include reason/notes

---

## Temporal Data

### Pattern 1: Effective Dating

```
Price:
  - id
  - product_id
  - amount
  - effective_from
  - effective_to (nullable = current)
```

**Current price:** `WHERE effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`

**Price at date:** `WHERE effective_from <= :date AND (effective_to IS NULL OR effective_to > :date)`

**Constraint:** No overlapping periods for same product.

### Pattern 2: Bitemporal

```
Price:
  - id
  - product_id
  - amount
  - valid_from (business time start)
  - valid_to (business time end)
  - recorded_at (system time)
  - superseded_at (system time, nullable = current record)
```

**Answers:**
- What was the price on date X? (business time)
- What did we think the price was on date X, as of date Y? (both times)
- When did we learn about this price? (system time)

**Use when:** Corrections happen, need to audit what was known when.

---

## Multi-Tenancy

### Shared Schema Pattern

```
Every table has:
  - tenant_id (NOT NULL, indexed)

All queries include:
  - WHERE tenant_id = :current_tenant
```

**Implementation Checklist:**
- [ ] tenant_id on every table
- [ ] Composite indexes include tenant_id first
- [ ] Unique constraints include tenant_id
- [ ] Application middleware enforces tenant filter
- [ ] Admin queries explicitly handle multi-tenant

### Row-Level Security (RLS)

If database supports it:
```
POLICY tenant_isolation ON table
  USING (tenant_id = current_setting('app.current_tenant'))
```

**Benefits:**
- Can't forget the filter
- Works for all queries including ad-hoc

**Drawbacks:**
- Must set session variable
- Performance overhead
- Debugging complexity

### Scaling Considerations

**Signs you've outgrown shared schema:**
- One tenant dominates storage (>50%)
- One tenant's queries affect others
- Tenant requires data residency
- Tenant requires different backup policy

**Migration path:**
1. Shared schema (start here)
2. Large tenants → dedicated schema
3. Enterprise tenants → dedicated database
