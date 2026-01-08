---
name: data-modeling
description: Data modeling principles for database schema design. Covers entity extraction, relationship analysis, normalization decisions, and architectural trade-offs. Use when designing schemas from business requirements or reviewing existing data structures.
---

# Data Modeling

Transform business requirements into well-structured, scalable database schemas.

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
| Will it have relationships? | If no, reconsider |

**Step 3: Classify Attributes**

For each attribute, determine:

| Classification | Examples |
|----------------|----------|
| Required vs Optional | email (required), phone (optional) |
| Mutable vs Immutable | status (mutable), created_at (immutable) |
| Unique vs Non-unique | email (unique), name (non-unique) |
| Derived vs Stored | age (derived from birth_date), total (stored) |

### Critical Questions Before Modeling

Ask these BEFORE designing:

1. **What are the top 5 most frequent queries?** → Design for these reads
2. **What's the read:write ratio?** → 90:10 vs 50:50 changes everything
3. **What's the expected data volume in 2 years?** → Affects partitioning decisions
4. **What consistency guarantees are needed?** → Affects transaction boundaries
5. **What are the reporting requirements?** → May need separate read models
6. **Who owns this data?** → Affects where entities live
7. **What's the data retention policy?** → Soft delete? Archive? Hard delete?

---

## 2. Relationship Analysis

### Determining Cardinality

| Can A have many B? | Can B have many A? | Type | FK Location |
|--------------------|--------------------|----- |-------------|
| Yes | Yes | Many-to-Many | Junction table |
| Yes | No | One-to-Many | FK on "many" side |
| No | No | One-to-One | FK on either (prefer dependent) |

### One-to-Many Relationships

```
User (1) ←――――→ (N) Post

Decision points:
- Is the relationship required? (NOT NULL on FK)
- What happens on parent delete? (CASCADE/RESTRICT/SET NULL)
- Will you query from both directions?
```

**Always ask:**
- "Can a Post exist without a User?" → No = Required, CASCADE
- "Can a Post be reassigned to another User?" → Yes = Mutable FK
- "How often do you query User's Posts vs Post's User?" → Index accordingly

### Many-to-Many Relationships

```
Post (N) ←――――→ (M) Tag

Junction table: post_tags
```

**Junction table decisions:**
- Does the relationship itself have attributes? (created_at, created_by, sort_order)
- Are duplicates allowed? (Composite PK prevents them)
- Is the relationship ordered? (Add sort_order)
- Who can create/delete the relationship? (Add created_by)

### One-to-One Relationships

**Before creating 1:1, ask:**
- Why not just add columns to the main table?
- Is it for access pattern separation? (frequently vs rarely accessed)
- Is it for security separation? (PII in separate table)
- Is it for optionality? (90% of records won't have this data)

**If you can't answer why → merge into one table.**

### Referential Integrity Decisions

| Action | Use When | Risk |
|--------|----------|------|
| CASCADE | Child meaningless without parent | Accidental mass deletion |
| RESTRICT | Deletion should be explicit decision | Orphan prevention blocks operations |
| SET NULL | Child can exist independently | Orphaned records accumulate |
| NO ACTION | Handle in application | Inconsistent data possible |

**Default to RESTRICT.** Use CASCADE only when you're certain child data is worthless without parent.

---

## 3. Normalization Strategy

### Forms Quick Reference

| Form | Rule | Violation Example | Fix |
|------|------|-------------------|-----|
| 1NF | Atomic values, no repeating groups | `tags: "a,b,c"` | Separate table |
| 2NF | No partial dependencies (on part of composite key) | `order_items.product_name` | Move to products |
| 3NF | No transitive dependencies | `orders.customer_city` | Move to customers |
| BCNF | Every determinant is a candidate key | Complex overlapping keys | Decompose further |

### Normalization Decision Framework

**Stay Normalized (3NF) When:**
- Write-heavy workload
- Data consistency is critical
- Data changes frequently after creation
- Multiple applications access same database
- Storage cost is a concern
- Team is small (less coordination needed)

**Consider Denormalization When:**
- Read-heavy workload (>90% reads)
- Query performance is critical path
- Data rarely changes after creation
- Single application owns the data
- You can afford the sync complexity

### Safe Denormalization Patterns

**Pattern 1: Cached Aggregates**
```
users.posts_count = COUNT(posts WHERE user_id = ?)

When: Displayed frequently, expensive to compute
Sync: Trigger or application on insert/delete
Risk: Count drift if sync fails
```

**Pattern 2: Snapshot at Event Time**
```
order_items.product_name (copied from products.name)
order_items.product_price (copied from products.price)

When: Historical accuracy required
Sync: Copy once at creation, never update
Risk: None (intentionally frozen)
```

**Pattern 3: Computed/Derived Columns**
```
orders.total = subtotal + tax + shipping

When: Frequently accessed, expensive to compute
Sync: Calculate on write
Risk: Drift if formula changes
```

**Pattern 4: Materialized Paths**
```
categories.path = "/electronics/phones/smartphones/"

When: Hierarchical queries are frequent
Sync: Update on parent change (complex!)
Risk: Path corruption on move operations
```

### Denormalization Documentation Rule

Every denormalized field MUST document:
1. **Source**: Where does the true data live?
2. **Sync method**: How is it kept in sync?
3. **Staleness tolerance**: How stale is acceptable?
4. **Recovery procedure**: What if it drifts?

---

## 4. Common Modeling Patterns

### Soft Deletes

```
Entity has: deleted_at (nullable timestamp)

Active records: WHERE deleted_at IS NULL
Deleted records: WHERE deleted_at IS NOT NULL
```

**Use When:**
- Regulatory data retention requirements
- Undo functionality needed
- Audit trail required
- Referential integrity with deleted parents

**Don't Use When:**
- GDPR "right to be forgotten" (need hard delete)
- Storage is constrained
- Performance on active queries matters (partial index helps)

**Critical:** All application queries must filter `WHERE deleted_at IS NULL`.

### Audit Trail

**Level 1: Last Modified Only**
```
created_at, created_by
updated_at, updated_by
```

**Level 2: Full History Table**
```
entity_history:
  - history_id (PK)
  - entity_id (FK)
  - all entity columns (snapshot)
  - changed_at
  - changed_by
  - operation (INSERT/UPDATE/DELETE)
  - changes (what changed, optional)
```

**Level 3: Event Sourcing**
```
Store events, not state
Current state = replay all events
```

Choose level based on audit requirements and query patterns.

### Polymorphic Associations

```
comments:
  - commentable_type: "post" | "product" | "article"
  - commentable_id: references different tables
```

**Trade-offs:**
- ✅ Flexible, single comments table
- ❌ No FK constraint, no referential integrity
- ❌ Can't JOIN without knowing type
- ❌ Type column can have invalid values

**Alternative: Separate Tables**
```
post_comments, product_comments, article_comments
```
- ✅ Referential integrity
- ❌ Duplicated structure
- ❌ Harder to "get all comments by user"

**Decision:** Use polymorphic if flexibility > integrity. Use separate tables if integrity > flexibility.

### Hierarchical Data

| Pattern | Description | Read | Write | Best For |
|---------|-------------|------|-------|----------|
| Adjacency List | `parent_id` self-reference | Slow (recursive) | Fast | Shallow trees, rare traversal |
| Materialized Path | `/1/4/7/` path string | Fast (LIKE) | Slow (update all children) | Read-heavy, stable hierarchy |
| Nested Sets | `left`/`right` boundaries | Fast | Very slow | Static trees, rare updates |
| Closure Table | All ancestor-descendant pairs | Fast | Medium | Balanced read/write needs |

**Decision Framework:**
1. How deep is the tree? (>10 levels = avoid nested sets)
2. How often does structure change? (frequently = adjacency list)
3. What queries are needed? (subtree = materialized path, ancestors = closure)

### Multi-Tenancy

| Pattern | Description | Isolation | Complexity |
|---------|-------------|-----------|------------|
| Shared Schema | `tenant_id` on every table | Low | Low |
| Schema per Tenant | Separate schemas, same DB | Medium | Medium |
| Database per Tenant | Separate databases | High | High |

**Shared Schema Risks:**
- Every query must include tenant filter
- One bad query exposes all tenant data
- Noisy neighbor performance issues

**Rule:** Start with shared schema + `tenant_id`, migrate to separate schemas/DBs when security or performance demands.

---

## 5. Architectural Considerations

### Bounded Contexts & Data Ownership

**Question:** Should these entities be in the same database?

| Signal | Same DB | Separate DB |
|--------|---------|-------------|
| Transactional consistency needed | ✅ | |
| Different teams own the data | | ✅ |
| Different scaling requirements | | ✅ |
| Different technology needs | | ✅ |
| Shared reporting requirements | ✅ | |

**If separate:** Define clear interfaces. Don't share tables across service boundaries.

### Scaling Considerations

**Vertical Partitioning (Split Columns)**
```
users → users + user_profiles

When: Some columns accessed rarely
      Some columns are large (TEXT, BLOB)
      Different access patterns
```

**Horizontal Partitioning (Split Rows)**
```
orders → orders_2023, orders_2024

When: Table exceeds single-node capacity
      Clear partition key exists (date, tenant)
      Queries include partition key
```

**When to Start Thinking About It:**
- Table > 10M rows
- Table > 10GB
- Query performance degrading despite indexing
- Backup/restore times unacceptable

### ID Strategy

| Type | Pros | Cons | Use When |
|------|------|------|----------|
| Auto-increment | Simple, compact, sortable | Predictable, centralized generation | Single database, internal IDs |
| UUID v4 | Globally unique, decentralized | Large (16 bytes), random = poor index locality | Distributed systems, external exposure |
| UUID v7 | Globally unique, time-sortable | Large (16 bytes) | Distributed + need ordering |
| ULID | Sortable, shorter than UUID | Less standard | APIs, user-facing IDs |
| Snowflake | Compact, sortable, distributed | Complex generation | High-volume distributed systems |

**Rule:** Pick ONE strategy and use it everywhere. Mixed ID strategies create confusion.

---

## 6. Design Process

### Step-by-Step Process

1. **Gather Requirements**
   - Interview stakeholders
   - Review existing systems
   - Document use cases and queries

2. **Identify Entities**
   - Extract nouns from requirements
   - Validate each as true entity
   - Define attributes for each

3. **Define Relationships**
   - Map all entity connections
   - Determine cardinality
   - Decide referential actions

4. **Normalize**
   - Apply normalization rules
   - Document any intentional denormalization

5. **Consider Access Patterns**
   - List top queries
   - Verify schema supports them efficiently
   - Add indexes (conceptually)

6. **Review for Scale**
   - Estimate data volumes
   - Identify potential bottlenecks
   - Plan for growth

7. **Document Decisions**
   - Create architecture document
   - Record all trade-offs and rationale

### Design Review Checklist

**Entities:**
- [ ] Each entity has clear purpose and owner
- [ ] No entity is "just in case"
- [ ] Naming is consistent and meaningful

**Relationships:**
- [ ] All relationships identified
- [ ] Cardinality determined and documented
- [ ] Referential actions explicitly chosen
- [ ] No circular required dependencies

**Attributes:**
- [ ] Required vs optional is explicit
- [ ] No redundant data (or documented if intentional)
- [ ] Appropriate granularity (not over-normalized)

**Integrity:**
- [ ] Natural keys identified (even if using surrogate PK)
- [ ] Uniqueness constraints defined
- [ ] Check constraints for valid values

**Scale:**
- [ ] Growth estimates documented
- [ ] No obvious N+1 query patterns
- [ ] Large tables have partition strategy

**Documentation:**
- [ ] ERD is current
- [ ] All denormalization documented
- [ ] Trade-off decisions recorded

---

## 7. Anti-Patterns to Avoid

### Entity Design
- ❌ **God Table**: One table with 50+ columns for "flexibility"
- ❌ **EAV (Entity-Attribute-Value)**: Generic key-value unless truly needed
- ❌ **Metadata Tables**: `table_name`, `column_name`, `value` pattern
- ❌ **No Natural Key Identified**: Every entity should have a business identifier

### Relationships
- ❌ **Missing Referential Integrity**: "We'll handle it in the app"
- ❌ **Circular Required Dependencies**: A requires B requires A
- ❌ **Over-use of Polymorphic**: When separate tables would be cleaner
- ❌ **Junction Table Without Identity**: Sometimes needs its own ID

### Normalization
- ❌ **Premature Denormalization**: Optimize before measuring
- ❌ **Undocumented Denormalization**: Future devs won't know sync rules
- ❌ **Over-Normalization**: 10 JOINs for simple query
- ❌ **Storing Computed Values That Change Frequently**: Sync overhead exceeds benefit

### General
- ❌ **Mixed ID Strategies**: Some tables BIGINT, others UUID
- ❌ **Inconsistent Naming**: `user_id` vs `userId` vs `UserID`
- ❌ **No Timestamps**: Not knowing when data was created/modified
- ❌ **Designing for Unknown Future**: "We might need this someday"

---

See [ARCHITECTURE.md](ARCHITECTURE.md) for documentation templates.
See [PATTERNS.md](PATTERNS.md) for detailed pattern implementations.
