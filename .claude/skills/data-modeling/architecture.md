# Architecture Documentation Templates

Templates for documenting data model decisions. Good documentation prevents future mistakes and helps onboarding.

---

## Database Architecture Document

Use this template for new projects or major redesigns.

```markdown
# [Project Name] Database Architecture

## Overview

[One paragraph: What does this database support? What's the bounded context?]

## Target Database

[PostgreSQL / SQLite] — [Why this choice]

## Design Principles

1. [e.g., "Soft deletes for all user-generated content"]
2. [e.g., "UTC timestamps everywhere"]
3. [e.g., "Tenant isolation via tenant_id on all tables"]
4. [e.g., "UUIDv7 for all primary keys"]

## Entity Overview

| Entity | Purpose | Owner | Est. Volume (Year 1) |
|--------|---------|-------|----------------------|
| users | User accounts | Auth Team | 100K |
| posts | User content | Content Team | 1M |
| orders | Purchase records | Commerce Team | 500K |

## Entity Details

### [Entity Name]

**Purpose**: [What this entity represents in business terms]

**Key Decisions**:
| Decision | Rationale |
|----------|-----------|
| [Decision] | [Why this choice] |

**Access Patterns**:
| Query | Frequency | Index |
|-------|-----------|-------|
| [Query description] | [High/Medium/Low] | [Index name] |

**Growth Projection**: [Current] → [2-year estimate]

## Relationships

| From | To | Type | On Delete | Rationale |
|------|----|------|-----------|-----------|
| orders | users | N:1 | RESTRICT | Orders are legal records |
| order_items | orders | N:1 | CASCADE | Items meaningless without order |
| posts | users | N:1 | SET NULL | Preserve content if user leaves |

## Patterns Selected

| Pattern | Choice | Rationale | Implementation |
|---------|--------|-----------|----------------|
| Soft delete | Yes, User/Order | Retention requirements | PATTERNS_[DB].md |
| Audit trail | Level 2 | Need accountability | PATTERNS_[DB].md |
| Hierarchy | Closure Table | Complex ancestor queries | PATTERNS_[DB].md |
| ID strategy | UUIDv7 | Distributed-ready | PATTERNS_[DB].md |

## Denormalization Log

| Field | Source | Sync Method | Staleness OK | Recovery |
|-------|--------|-------------|--------------|----------|
| users.post_count | COUNT(posts) | Trigger | Yes | Recalculate script |
| orders.total | SUM(order_items) | App code | No | Must match |

## Indexing Strategy

| Table | Index | Supports Query | Notes |
|-------|-------|----------------|-------|
| posts | posts_user_id_idx | User's posts | Most common query |
| posts | posts_created_at_idx | Recent posts feed | Descending |
| orders | orders_tenant_status_idx | Tenant dashboard | Composite |

## Security

**PII Columns**: 
- users.email
- users.phone
- users.address

**Row-Level Security**: [Describe RLS policy if used, or "Application-enforced" for SQLite]

**Encryption**: [At-rest, in-transit, column-level]
```

---

## Architecture Decision Record (ADR)

Use ADRs for significant decisions that future developers need to understand.

```markdown
# ADR-[NUMBER]: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date

[YYYY-MM-DD]

## Context

[What is the issue? What forces are at play? Why does this decision need to be made?]

## Decision

[What was decided? Be specific.]

## Alternatives Considered

### Option A: [Name]
- **Pros**: ...
- **Cons**: ...

### Option B: [Name]
- **Pros**: ...
- **Cons**: ...

## Consequences

**Positive**:
- [Benefit 1]
- [Benefit 2]

**Negative**:
- [Drawback 1]
- [Drawback 2]

**Risks and Mitigations**:
- [Risk]: [Mitigation]
```

---

## Example ADRs

### ADR-001: Database Selection

**Status**: Accepted  
**Date**: 2024-01-15

**Context**: 
Starting new project. Need to choose between PostgreSQL and SQLite. Expected load is moderate (<50 writes/sec), single server deployment, but may scale later.

**Decision**: 
Use PostgreSQL from the start.

**Alternatives Considered**:

*Option A: SQLite*
- Pros: Zero config, embedded, simple deployment
- Cons: Single writer, no RLS, limited ALTER TABLE, migration path to PG is painful

*Option B: PostgreSQL*
- Pros: Full SQL features, RLS, concurrent writes, scales horizontally
- Cons: Requires server setup, more operational overhead

**Consequences**:
- Positive: No migration needed if we scale, full feature set available
- Negative: More initial setup, need to manage database server
- Risk: Over-engineering for MVP → Mitigate by using managed PostgreSQL (Supabase/Neon)

---

### ADR-002: Soft Delete Strategy

**Status**: Accepted  
**Date**: 2024-01-15

**Context**: 
Need to handle data deletion. Regulatory requires 90-day retention. Users expect undo. Support needs recovery capability.

**Decision**: 
Soft deletes via `deleted_at` for user-generated content. Hard delete for ephemeral data.

**Alternatives Considered**:

*Option A: Hard delete everything*
- Pros: Simple, clean, GDPR-friendly
- Cons: No undo, no audit trail, no recovery

*Option B: Archive tables*
- Pros: Clean separation, no WHERE clause pollution
- Cons: Complex queries, migration overhead

**Consequences**:
- Positive: Undo possible, audit preserved, support can recover
- Negative: Every query needs `WHERE deleted_at IS NULL`
- Risk: Developer forgets filter → Mitigate with query builder defaults

---

### ADR-003: ID Strategy

**Status**: Accepted  
**Date**: 2024-01-15

**Context**: 
Need globally unique IDs. May distribute across regions later. IDs exposed in URLs.

**Decision**: 
UUIDv7 for all primary keys.

**Alternatives Considered**:

*Option A: Auto-increment BIGINT*
- Pros: Compact, human-readable, fast
- Cons: Predictable, requires coordination, reveals volume

*Option B: UUIDv4*
- Pros: Globally unique, no coordination
- Cons: Random (poor index locality), not sortable

*Option C: UUIDv7*
- Pros: Globally unique, time-sortable, good locality
- Cons: 16 bytes, requires library

**Consequences**:
- Positive: No conflicts across regions, natural ordering
- Negative: Larger storage (16 vs 8 bytes)
- Risk: Library compatibility → Use well-maintained library

---

## Denormalization Decision Template

Use when adding any denormalized field.

```markdown
## Denormalized Field: [table.column]

**Date Added**: [YYYY-MM-DD]

**Source of Truth**: [Original table.column or calculation]

**Reason**: [Performance? Query simplicity?]

**Sync Method**: 
- [ ] Database trigger
- [ ] Application code (which service?)
- [ ] Scheduled job (frequency?)

**Staleness Tolerance**: [Immediate | Seconds | Minutes | Hours]

**Consistency Check**:
```sql
-- Query to detect drift
SELECT id FROM [table] 
WHERE [denormalized_column] != ([calculation]);
```

**Recovery Procedure**:
```sql
-- Query to fix drift
UPDATE [table] SET [denormalized_column] = ([calculation]);
```

**Monitoring**: [How to detect sync failure?]
```

---

## Migration Checklist

Use for any schema change.

```markdown
## Migration: [Description]

**Date**: [YYYY-MM-DD]
**Author**: [Name]
**Risk Level**: [Low | Medium | High]
**Target Database**: [PostgreSQL | SQLite]

### Pre-Migration

- [ ] Tested on production-size dataset
- [ ] Estimated duration: [X minutes]
- [ ] Backup verified
- [ ] Rollback script tested
- [ ] Maintenance window scheduled (if needed)

### Changes

| Change | Duration | Locking | Notes |
|--------|----------|---------|-------|
| [Change 1] | [Est.] | [Yes/No] | [DB-specific notes] |

### Migration Steps

1. [Step]
2. [Step]

### Post-Migration

- [ ] Verify row counts
- [ ] Verify data integrity
- [ ] Application health check
- [ ] Monitor error rates

### Rollback Steps

1. [Step]
2. [Step]
```

---

## Quick Reference: What to Document

| Change Type | Required Documentation |
|-------------|----------------------|
| New entity | Entity details in Architecture Doc |
| New relationship | Relationships table + rationale |
| Denormalization | Denormalization Decision Template |
| Pattern choice | ADR |
| ID strategy | ADR |
| Database selection | ADR |
| Schema migration | Migration Checklist |
