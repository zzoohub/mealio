---
name: data-modeling
description: |
  Transform business requirements into logical data models.
  Use when: entity extraction, relationship analysis, normalization decisions, schema design.
  Do not use for: physical implementation details (use postgresql or sqlite skill after this).
  Workflow: this skill (design) → postgresql/sqlite skill (implement).
references:
  - patterns.md              # DB-agnostic pattern concepts and decision guides
  - patterns-postgresql.md   # PostgreSQL-specific implementations
  - patterns-sqlite.md       # SQLite-specific implementations
  - architecture.md          # Documentation templates, ADR examples
  - anti-patterns.md         # Common mistakes and how to avoid them
---

# Data Modeling

Transform business requirements into well-structured, scalable data models.

**This skill focuses on logical modeling** — what entities exist and how they relate. For physical implementation (DDL, indexes, migrations), use the appropriate database skill after completing the model.

---

## Process Overview

1. **Discover** → Extract entities from requirements
2. **Analyze** → Define relationships and cardinality
3. **Normalize** → Decide on normalization level
4. **Pattern** → Select appropriate patterns (see PATTERNS.md)
5. **Document** → Record decisions (see ARCHITECTURE.md)
6. **Implement** → Hand off to postgresql/sqlite skill

---

## 1. Discovery: Entity Extraction

### From Requirements to Entities

**Step 1: Identify nouns in requirements**

```
"Users can create posts. Posts have tags. Users comment on posts."
→ Nouns: Users, Posts, Tags, Comments
```

**Step 2: Validate each noun as entity**

| Question | If No |
|----------|-------|
| Has its own identity? | It's an attribute |
| Has multiple attributes? | It's just a column |
| Queried independently? | Consider embedding |
| Changes independently? | Embed with parent |

**Step 3: Classify attributes**

- Required vs Optional
- Mutable vs Immutable  
- Unique vs Non-unique
- Derived vs Stored

### Critical Questions (Ask Before Modeling)

1. **Top 5 queries?** → Design for these first
2. **Read:write ratio?** → Affects denormalization decisions
3. **Volume in 2 years?** → Partitioning needs
4. **Consistency needs?** → Transaction boundaries
5. **Retention policy?** → Soft delete? Archive?
6. **Target database?** → PostgreSQL or SQLite? (affects pattern implementation)

---

## 2. Analysis: Relationships

### Cardinality Decision Matrix

| A has many B? | B has many A? | Type | Implementation |
|---------------|---------------|------|----------------|
| Yes | Yes | N:M | Junction table |
| Yes | No | 1:N | FK on "many" side |
| No | No | 1:1 | FK on dependent side (justify why not merged) |

### Referential Actions

| Action | Use When | Example |
|--------|----------|---------|
| RESTRICT | Default choice - deletion should be explicit | User with orders |
| CASCADE | Child meaningless without parent | Order → Order items |
| SET NULL | Child can exist independently | Post → Author left |

**Rule: Default to RESTRICT. Use CASCADE only when child is worthless without parent.**

### Junction Table Decisions

When creating N:M junction tables, decide:
- Does relationship have attributes? (created_at, sort_order)
- Are duplicates allowed?
- Is ordering needed?
- Who creates the link? (created_by)

---

## 3. Normalization Strategy

### Quick Reference

| Form | Rule | Violation Example | Fix |
|------|------|-------------------|-----|
| 1NF | Atomic values | `tags: "a,b,c"` | Separate table |
| 2NF | No partial dependencies | `order_items.product_name` | Move to products |
| 3NF | No transitive dependencies | `orders.customer_city` | Move to customers |

### Decision: Normalize vs Denormalize

**Normalize (3NF) when:**
- Write-heavy workload
- Data consistency is critical
- Data changes frequently
- Multiple apps access same DB

**Denormalize when:**
- Read-heavy (>90% reads)
- Query performance is critical path
- Data rarely changes after creation
- Single app owns the data
- You accept sync complexity

### Safe Denormalization Patterns

| Pattern | When | Sync | Risk |
|---------|------|------|------|
| Cached aggregates | Displayed often, expensive to compute | Trigger | Count drift |
| Snapshot at event | Historical accuracy required | Copy once, never update | None |
| Materialized path | Hierarchical queries frequent | Update on parent change | Path corruption |

**Rule: Every denormalized field MUST document: source, sync method, staleness tolerance, recovery procedure.**

---

## 4. Common Patterns (Logical Design)

See PATTERNS.md for decision guides. See PATTERNS_POSTGRESQL.md or PATTERNS_SQLITE.md for implementation.

| Pattern | Use When | Key Decision |
|---------|----------|--------------|
| Soft deletes | Retention requirements, undo needed | Unique constraint handling |
| Audit trail | Compliance, debugging | Level of detail needed |
| Polymorphic | Comments/likes across multiple parent types | Integrity vs flexibility |
| Hierarchical | Categories, org charts, nested structures | Read vs write frequency |
| State machine | Entity has lifecycle stages | Valid transitions |
| Temporal | Price history, effective dating | Overlap prevention |
| Multi-tenancy | SaaS with multiple customers | Isolation level |

---

## 5. Scaling Considerations

### Partitioning Triggers

| Signal | Consider |
|--------|----------|
| Table > 100M rows | Horizontal partitioning |
| Some columns rarely accessed | Vertical partitioning |
| Clear time-based access pattern | Time-based partitioning |

### ID Strategy (Pick ONE for entire project)

| Type | Use When |
|------|----------|
| Auto-increment | Single database, simple setup |
| UUID v4 | Distributed systems, no ordering needed |
| UUID v7 | Distributed + need time-based sorting |

**Note**: SQLite uses INTEGER PRIMARY KEY for auto-increment. PostgreSQL uses BIGINT + GENERATED ALWAYS AS IDENTITY.

---

## 6. Output Format

Deliver logical models as:

### Required Deliverables

1. **Entity List** - Attributes with types and constraints
2. **Relationship Diagram** - Mermaid or text representation
3. **Decision Log** - Trade-offs explained with rationale
4. **Target Database** - PostgreSQL or SQLite (affects implementation)

### Template

```markdown
## Target Database: [PostgreSQL / SQLite]

## Entities

### User
- id: PK
- email: unique, required, immutable after verification
- name: required, mutable
- created_at: immutable, auto

### Order  
- id: PK
- user_id: FK → User, required
  - ON DELETE: RESTRICT (orders are business records)
- status: enum(pending|confirmed|shipped|delivered|cancelled)
- total: decimal, required, immutable after confirmation

## Relationships

- User 1:N Order
- Order N:M Product (via order_items junction)

## Patterns Selected

| Pattern | Decision | See Implementation |
|---------|----------|-------------------|
| Soft delete | Yes, for User and Order | PATTERNS_[DB].md |
| Audit trail | Level 2 (actor tracking) | PATTERNS_[DB].md |
| ID strategy | UUIDv7 | PATTERNS_[DB].md |

## Decisions

| Decision | Rationale |
|----------|-----------|
| RESTRICT on Order→User | Orders are legal records, can't delete user with order history |
| Immutable order.total | Matches invoice, prevents post-hoc disputes |

## Denormalization

| Field | Source | Sync | Staleness OK |
|-------|--------|------|--------------|
| user.order_count | COUNT(orders) | Trigger | Yes (display only) |

## Next Step

Implement using `postgresql` or `sqlite` skill with PATTERNS_[DB].md reference.
```

---

## Quick Checklist

Before finalizing any model:

- [ ] Target database identified (PostgreSQL vs SQLite)
- [ ] Top 5 queries can be served efficiently
- [ ] Every FK has explicit ON DELETE action with documented reason
- [ ] No 1:1 relationships without documented justification
- [ ] All denormalized fields have sync strategy documented
- [ ] ID strategy is consistent across all entities
- [ ] Timestamps (created_at, updated_at) on all mutable entities
- [ ] Soft delete decision made and documented
- [ ] Patterns selected with implementation reference
- [ ] Checked against ANTI_PATTERNS.md
