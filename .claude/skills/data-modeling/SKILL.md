---
name: data-modeling
description: Transform business requirements into logical data models. Covers entity extraction, relationship analysis, normalization decisions, and pattern selection. For pattern implementation details, see references.
references:
  - PATTERNS.md    # Detailed implementation for soft deletes, audit trails, hierarchies, polymorphic, etc.
  - ARCHITECTURE.md # Documentation templates, ADR examples
---

# Data Modeling

Transform business requirements into well-structured, scalable data models.

---

## 1. Entity Extraction

### From Requirements to Entities

**Step 1: Identify Nouns**

```
PRD: "Users can create posts. Posts can have multiple tags. 
      Users can comment on posts and like them."

Nouns: Users, Posts, Tags, Comments, Likes
```

**Step 2: Validate Each Noun**

| Question | If No → |
|----------|---------|
| Does it have its own identity? | Probably an attribute |
| Does it have multiple attributes? | Might be just a column |
| Will you query it independently? | Consider embedding |
| Does it change independently? | Embed with parent |

**Step 3: Classify Attributes**

| Classification | Examples |
|----------------|----------|
| Required vs Optional | email (required), phone (optional) |
| Mutable vs Immutable | status (mutable), created_at (immutable) |
| Unique vs Non-unique | email (unique), name (non-unique) |
| Derived vs Stored | age (derived from birth_date), total (stored) |

### Critical Questions Before Modeling

Ask these BEFORE designing:

1. **Top 5 most frequent queries?** → Design for these
2. **Read:write ratio?** → 90:10 vs 50:50 changes everything
3. **Expected data volume in 2 years?** → Affects partitioning
4. **Consistency requirements?** → Transaction boundaries
5. **Reporting requirements?** → May need read models
6. **Data retention policy?** → Soft delete? Archive?

---

## 2. Relationship Analysis

### Determining Cardinality

| Can A have many B? | Can B have many A? | Type | Implementation |
|--------------------|--------------------|----- |----------------|
| Yes | Yes | N:M | Junction table |
| Yes | No | 1:N | FK on "many" side |
| No | No | 1:1 | FK on dependent side |

### One-to-Many (1:N)

```
User (1) ←――――→ (N) Order

Questions:
- Can Order exist without User? → No = NOT NULL FK
- What on parent delete? → CASCADE / RESTRICT / SET NULL
- Query both directions? → Index accordingly
```

**Decision Guide:**
- "Can child exist without parent?" → No = CASCADE
- "Is reassignment allowed?" → Yes = mutable FK
- "Need to query parent's children often?" → Index the FK

### Many-to-Many (N:M)

```
Post (N) ←――――→ (M) Tag

Junction: post_tags (post_id, tag_id)
```

**Junction Table Decisions:**
- Does relationship have attributes? (created_at, sort_order)
- Are duplicates allowed? (composite PK prevents them)
- Is ordering needed? (add sort_order)
- Who creates the link? (add created_by)

### One-to-One (1:1)

**Before creating 1:1, justify it:**
- Access pattern separation? (hot vs cold data)
- Security separation? (PII in separate table)
- High optionality? (90% of rows won't have this)

**If you can't justify → merge into one table.**

### Referential Actions

| Action | Use When |
|--------|----------|
| CASCADE | Child meaningless without parent |
| RESTRICT | Deletion should be explicit (default choice) |
| SET NULL | Child can exist independently |

**Default to RESTRICT.** Only use CASCADE when child data is worthless without parent.

---

## 3. Normalization Strategy

### Quick Reference

| Form | Rule | Violation | Fix |
|------|------|-----------|-----|
| 1NF | Atomic values | `tags: "a,b,c"` | Separate table |
| 2NF | No partial dependencies | `order_items.product_name` | Move to products |
| 3NF | No transitive dependencies | `orders.customer_city` | Move to customers |

### When to Normalize (3NF)

- Write-heavy workload
- Data consistency is critical
- Data changes frequently
- Multiple apps access same DB
- Storage is a concern

### When to Denormalize

- Read-heavy (>90% reads)
- Query performance is critical path
- Data rarely changes after creation
- Single app owns the data
- You accept sync complexity

### Safe Denormalization Patterns

**Cached Aggregates**
```
users.posts_count

When: Displayed frequently, expensive to compute
Sync: Trigger on insert/delete
Risk: Count drift if sync fails
```

**Snapshot at Event Time**
```
order_items.product_price (copied from products.price)

When: Historical accuracy required
Sync: Copy once at creation, never update
Risk: None (intentionally frozen)
```

**Materialized Paths**
```
categories.path = "/electronics/phones/"

When: Hierarchical queries frequent
Sync: Update on parent change
Risk: Path corruption on moves
```

### Documentation Rule

Every denormalized field MUST document:
1. **Source**: Where does true data live?
2. **Sync method**: How is it kept in sync?
3. **Staleness tolerance**: How stale is acceptable?
4. **Recovery**: What if it drifts?

---

## 4. Common Patterns

### Soft Deletes

```
deleted_at: nullable timestamp

Active: WHERE deleted_at IS NULL
Deleted: WHERE deleted_at IS NOT NULL
```

**Use When:**
- Data retention requirements
- Undo functionality needed
- Audit trail required

**Don't Use When:**
- GDPR "right to be forgotten"
- Storage constrained
- Most queries need active only (use partial index)

### Audit Trail

**Level 1: Last Modified**
```
created_at, created_by
updated_at, updated_by
```

**Level 2: History Table**
```
entity_history:
  - entity_id
  - all columns (snapshot)
  - changed_at, changed_by
  - operation (INSERT/UPDATE/DELETE)
```

**Level 3: Event Sourcing**
```
Store events, derive state
Current state = replay events
```

### Polymorphic Associations

```
comments:
  - commentable_type: "post" | "product"
  - commentable_id: references different tables
```

**Trade-offs:**
- ✅ Flexible, single table
- ❌ No FK constraint
- ❌ Can't JOIN without type

**Alternative:** Separate tables per type
- ✅ Referential integrity
- ❌ Duplicated structure

**Decision:** Flexibility > integrity → polymorphic. Integrity > flexibility → separate.

### Hierarchical Data

| Pattern | Read | Write | Best For |
|---------|------|-------|----------|
| Adjacency List | Slow | Fast | Shallow, frequent updates |
| Materialized Path | Fast | Slow | Read-heavy, stable |
| Closure Table | Fast | Medium | Balanced needs |

### Multi-Tenancy

| Pattern | Isolation | Complexity |
|---------|-----------|------------|
| Shared + tenant_id | Low | Low |
| Schema per tenant | Medium | Medium |
| Database per tenant | High | High |

**Start with shared schema**, migrate up when needed.

### State Machines

```
status column with valid transitions

pending → confirmed → shipped → delivered
    ↓         ↓
 cancelled  cancelled
```

**Use When:**
- Entity has lifecycle stages
- Transitions need validation
- Audit trail of status changes needed

**Implementation:** See PATTERNS.md for transition validation triggers.

---

## 5. Scaling Considerations

### Vertical Partitioning (Split Columns)

```
users → users + user_profiles

When: Some columns rarely accessed
      Some columns are large (TEXT, BLOB)
```

### Horizontal Partitioning (Split Rows)

```
orders → orders_2023, orders_2024

When: Table > 100M rows
      Clear partition key exists
      Queries include partition key
```

### ID Strategy

| Type | Pros | Cons | Use When |
|------|------|------|----------|
| Auto-increment | Simple, compact | Predictable, centralized | Single DB |
| UUID v4 | Globally unique | Large, random | Distributed |
| UUID v7 | Unique + sortable | Large | Distributed + ordering |

**Pick ONE and use everywhere.**

---

## 6. Anti-Patterns

### Entity Design
- ❌ **God Table**: 50+ columns "for flexibility"
- ❌ **EAV Pattern**: Generic key-value unless truly needed
- ❌ **No Natural Key**: Every entity needs business identifier

### Relationships
- ❌ **Missing FK Constraints**: "Handle in app"
- ❌ **Circular Dependencies**: A requires B requires A

### Normalization
- ❌ **Premature Denormalization**: Optimize before measuring
- ❌ **Undocumented Denormalization**: Future devs won't know rules
- ❌ **Over-Normalization**: 10 JOINs for simple query

### General
- ❌ **Mixed ID Strategies**: Some BIGINT, some UUID
- ❌ **No Timestamps**: Always track created/modified
- ❌ **Future-proofing**: "Might need someday"

---

## 7. Output Format

Deliver logical models as:

1. **Entity List** with attributes and constraints
2. **Relationship Diagram** (text or visual)
3. **Decision Log** explaining trade-offs

```
## Entities

### User
- id: PK
- email: unique, required
- name: required
- created_at: immutable

### Order  
- id: PK
- user_id: FK → User, required, CASCADE
- status: enum, default 'pending'
- total: decimal, required

## Relationships
- User 1:N Order (user can have many orders)
- Order N:M Product via order_items

## Decisions
- Chose CASCADE on Order→User: orders meaningless without user
- Denormalized order.total: calculated once, never changes
```
