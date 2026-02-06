# Pattern Concepts & Decision Guides

This file covers **when and why** to use each pattern. For **how to implement**, see:
- PATTERNS_POSTGRESQL.md — PostgreSQL-specific DDL and techniques
- PATTERNS_SQLITE.md — SQLite-specific DDL and workarounds

---

## Soft Delete

### When to Use

✅ **Use soft delete when:**
- Regulatory/compliance requires data retention
- Users need undo functionality
- Support team needs to recover deleted data
- Audit trail of deletions required

❌ **Don't use soft delete when:**
- GDPR "right to be forgotten" applies (need hard delete)
- Storage is constrained
- Ephemeral data (sessions, tokens, temp files)

### Key Decisions

| Decision | Options | Trade-off |
|----------|---------|-----------|
| Unique constraints | Partial index vs Anonymize | Query complexity vs Data preservation |
| Cascade behavior | Soft delete children too? | Consistency vs Orphaned soft-deleted children |
| Query default | Always filter vs Explicit | Safety vs Verbosity |

### Logical Design

```
Entity:
- deleted_at: timestamp, nullable
- Null = active, Not null = deleted

Query patterns:
- Active: WHERE deleted_at IS NULL
- Deleted: WHERE deleted_at IS NOT NULL
- All: no filter
```

### Restoration Checklist

1. Set deleted_at = NULL
2. Check for uniqueness conflicts (someone else took the email?)
3. Decide: restore children too?
4. Re-validate business rules

---

## Audit Trail

### Levels

| Level | What's Tracked | Use When |
|-------|---------------|----------|
| 1: Timestamps | created_at, updated_at | Minimum for any system |
| 2: Actor | + created_by, updated_by | Need accountability |
| 3: History | Full row snapshots | Need point-in-time recovery |
| 4: Diff | JSON of changed fields only | Large rows, storage concern |

### Key Decisions

| Decision | Options | Trade-off |
|----------|---------|-----------|
| Storage | Same table vs History table vs Event log | Query simplicity vs Storage efficiency |
| Granularity | Row-level vs Field-level | Storage vs Detail |
| Retention | Forever vs Time-limited | Compliance vs Storage |

### Logical Design

**Level 2 (Actor Tracking):**
```
Entity:
- created_at: timestamp, immutable
- created_by: FK → User
- updated_at: timestamp, auto-update
- updated_by: FK → User
```

**Level 3 (History Table):**
```
EntityHistory:
- history_id: PK
- entity_id: FK → Entity
- [all entity columns as snapshot]
- version: integer
- operation: INSERT | UPDATE | DELETE
- changed_at: timestamp
- changed_by: FK → User
```

---

## Hierarchical Data

### Pattern Comparison

| Pattern | Read Speed | Write Speed | Best For |
|---------|------------|-------------|----------|
| Adjacency List | Slow (recursive) | Fast | Shallow trees, frequent moves |
| Materialized Path | Fast | Slow | Read-heavy, stable structure |
| Closure Table | Fast | Medium | Balanced, complex ancestry queries |

### Decision Guide

**Choose Adjacency List when:**
- Tree depth < 5 levels
- Frequent node moves
- Simple parent lookup is enough

**Choose Materialized Path when:**
- Read-heavy (>90%)
- Need "all descendants" queries
- Structure rarely changes

**Choose Closure Table when:**
- Need both ancestor AND descendant queries
- Moderate write frequency
- Complex hierarchy operations

### Logical Design

**Adjacency List:**
```
Category:
- id: PK
- parent_id: FK → Category (nullable for root)
- name: string
```

**Materialized Path:**
```
Category:
- id: PK
- path: string (e.g., "/1/5/12/")
- name: string
```

**Closure Table:**
```
Category:
- id: PK
- name: string

CategoryClosure:
- ancestor_id: FK → Category
- descendant_id: FK → Category
- depth: integer
- PK: (ancestor_id, descendant_id)
```

---

## Polymorphic Associations

### Pattern Comparison

| Pattern | Referential Integrity | Flexibility | Query Complexity |
|---------|----------------------|-------------|------------------|
| Type + ID | ❌ None | ✅ High | Medium |
| Separate FKs | ✅ Full | ❌ Low | Low |
| Intermediate Entity | ✅ Full | ✅ High | High |

### Decision Guide

**Choose Type + ID when:**
- Many possible parent types
- Can tolerate orphaned records
- Need maximum flexibility

**Choose Separate FKs when:**
- Fixed, small set of parent types (2-3)
- Referential integrity is critical
- Can accept schema changes for new types

**Choose Intermediate Entity when:**
- Must have referential integrity
- Need flexibility for new types
- Can accept extra join complexity

### Logical Design

**Type + ID:**
```
Comment:
- id: PK
- commentable_type: string ("post" | "product")
- commentable_id: integer (no FK constraint)
- body: text
```

**Separate FKs:**
```
Comment:
- id: PK
- post_id: FK → Post (nullable)
- product_id: FK → Product (nullable)
- body: text
- CHECK: exactly one FK is non-null
```

**Intermediate Entity:**
```
Commentable:
- id: PK

Post:
- id: PK
- commentable_id: FK → Commentable (unique)

Product:
- id: PK  
- commentable_id: FK → Commentable (unique)

Comment:
- id: PK
- commentable_id: FK → Commentable
- body: text
```

---

## State Machine

### When to Use

✅ **Use state machine when:**
- Entity has distinct lifecycle stages
- Transitions must be validated
- Need audit trail of status changes
- Business rules depend on current state

### Key Decisions

| Decision | Options | Trade-off |
|----------|---------|-----------|
| Validation | Database trigger vs Application | Safety vs Flexibility |
| History | Store all transitions vs Current only | Audit vs Storage |
| Transitions | Strict vs Permissive | Safety vs Flexibility |

### Logical Design

```
Order:
- id: PK
- status: enum(pending|confirmed|shipped|delivered|cancelled)
- status_changed_at: timestamp

Valid transitions:
  pending → confirmed, cancelled
  confirmed → shipped, cancelled
  shipped → delivered
  delivered → (terminal)
  cancelled → (terminal)

OrderStatusHistory (optional):
- id: PK
- order_id: FK → Order
- from_status: enum (nullable for initial)
- to_status: enum
- changed_at: timestamp
- changed_by: FK → User
- reason: text (nullable)
```

---

## Temporal Data (Effective Dating)

### When to Use

✅ **Use temporal data when:**
- Need historical values (what was the price on Jan 1?)
- Business rules require effective dating
- Compliance requires point-in-time accuracy

### Key Decisions

| Decision | Options | Trade-off |
|----------|---------|-----------|
| End date | Explicit vs NULL for current | Query simplicity vs Storage |
| Overlap prevention | Database constraint vs Application | Safety vs DB compatibility |
| Granularity | Day vs Timestamp | Simplicity vs Precision |

### Logical Design

```
Price:
- id: PK
- product_id: FK → Product
- amount: decimal
- effective_from: timestamp
- effective_to: timestamp (nullable, NULL = current)
- Constraint: no overlapping periods for same product_id

Queries:
- Current: WHERE effective_from <= NOW AND (effective_to IS NULL OR effective_to > NOW)
- At date: WHERE effective_from <= :date AND (effective_to IS NULL OR effective_to > :date)
```

---

## Multi-Tenancy

### Pattern Comparison

| Pattern | Isolation | Complexity | Cost |
|---------|-----------|------------|------|
| Shared schema + tenant_id | Low | Low | Low |
| Schema per tenant | Medium | Medium | Medium |
| Database per tenant | High | High | High |

### Decision Guide

**Choose Shared Schema when:**
- Starting out / MVP
- Most tenants are small
- Simple deployment preferred
- Can enforce tenant_id in every query

**Choose Schema per Tenant when:**
- Compliance requires logical separation
- Tenants need custom indexes
- Moderate number of tenants (<100)

**Choose Database per Tenant when:**
- Strict compliance/legal isolation
- Tenants need independent backups
- Enterprise customers demanding it
- Can afford operational complexity

### Logical Design (Shared Schema)

```
Every table:
- tenant_id: FK → Tenant, required, NOT NULL

Indexes:
- All queries by tenant: tenant_id as first column
- Unique constraints: include tenant_id

Example:
User:
- id: PK
- tenant_id: FK → Tenant
- email: string
- Unique: (tenant_id, email)  -- email unique within tenant
```

---

## ID Strategy

### Comparison

| Type | Size | Sortable | Predictable | Coordination |
|------|------|----------|-------------|--------------|
| Auto-increment | 8 bytes | Yes | Yes (security risk) | Required |
| UUID v4 | 16 bytes | No | No | None |
| UUID v7 | 16 bytes | Yes (time) | Partially | None |

### Decision Guide

**Choose Auto-increment when:**
- Single database (no sharding planned)
- IDs not exposed publicly
- Storage efficiency matters
- Simple debugging preferred

**Choose UUID v4 when:**
- Distributed system
- Need to generate IDs client-side
- No ordering requirements

**Choose UUID v7 when:**
- Distributed system
- Want time-based ordering
- Better index locality than v4

### Rule

**Pick ONE strategy for entire project. Mix = pain.**

---

## Pattern Selection Checklist

For each pattern decision, document:

1. **Which pattern?** (e.g., Closure Table for hierarchy)
2. **Why this pattern?** (e.g., need both ancestor and descendant queries)
3. **What trade-offs accepted?** (e.g., extra storage for closure rows)
4. **Implementation reference** (e.g., see PATTERNS_POSTGRESQL.md)
