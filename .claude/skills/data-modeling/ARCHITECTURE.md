# Architecture Documentation Templates

Templates for documenting data model decisions.

---

## Database Architecture Document

```markdown
# [Project Name] Database Architecture

## Overview
[One paragraph: What does this database support? What's the bounded context?]

## Design Principles
1. [e.g., "Soft deletes for all user-generated content"]
2. [e.g., "UTC timestamps everywhere"]
3. [e.g., "Tenant isolation via tenant_id on all tables"]

## Entity Overview

| Entity | Purpose | Owner | Est. Volume (Year 1) |
|--------|---------|-------|----------------------|
| users | User accounts | Auth | 100K |
| posts | User content | Content | 1M |

## Entity Details

### [Entity Name]

**Purpose**: [What this represents]

**Key Decisions**:
- [Decision]: [Rationale]

**Access Patterns**:
- [Query] - [Frequency]

**Growth**: [Current] → [2-year estimate]

## Relationships

| From | To | Type | On Delete | Rationale |
|------|----|------|-----------|-----------|
| posts | users | N:1 | CASCADE | Posts meaningless without author |

## Denormalization Log

| Field | Source | Sync Method | Staleness OK? |
|-------|--------|-------------|---------------|
| posts.comment_count | COUNT(comments) | Trigger | No |

## Indexing Strategy

| Index | Supports Query |
|-------|----------------|
| posts(user_id) | User's posts |
| posts(created_at) | Recent posts feed |

## Security

**PII Columns**: users.email, users.phone

**Row-Level Security**: [Yes/No, how?]
```

---

## Architecture Decision Record (ADR)

```markdown
# ADR-[NUMBER]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
[What is the issue? What forces are at play?]

## Decision
[What was decided?]

## Alternatives Considered

### Option A: [Name]
- Pros: ...
- Cons: ...

### Option B: [Name]
- Pros: ...
- Cons: ...

## Consequences

**Positive**: [Benefits]

**Negative**: [Drawbacks]

**Risks**: [Risk and mitigation]
```

---

## Example ADRs

### ADR-001: Soft Delete Strategy

**Status**: Accepted

**Context**: Need to handle data deletion. Regulatory requires 90-day retention. Users expect undo.

**Decision**: Soft deletes via `deleted_at` for user content. Hard delete for sessions/tokens.

**Alternatives**:
- Hard delete: Simple, but no undo, no audit
- Archive tables: Clean separation, but complex queries

**Consequences**:
- Positive: Undo possible, audit preserved
- Negative: All queries need `deleted_at IS NULL`
- Risk: Forgotten filter → mitigate with query builder defaults

---

### ADR-002: ID Strategy

**Status**: Accepted

**Context**: Need globally unique IDs. Distributed system. IDs exposed in URLs.

**Decision**: UUIDv7 for all primary keys.

**Alternatives**:
- Auto-increment: Compact but predictable, coordination needed
- UUIDv4: Unique but random (poor index locality)
- UUIDv7: Unique + time-sortable + good locality

**Consequences**:
- Positive: No conflicts across regions, natural ordering
- Negative: 16 bytes vs 8 for BIGINT
- Risk: Library support → use well-maintained lib

---

### ADR-003: Multi-Tenancy

**Status**: Accepted

**Context**: SaaS with hundreds of tenants. Most small (<1K records), some large (>1M).

**Decision**: Shared schema with `tenant_id`. Option to migrate large tenants later.

**Alternatives**:
- DB per tenant: Complete isolation, high ops cost
- Schema per tenant: Good isolation, migration overhead

**Consequences**:
- Positive: Simple deployment, easy onboarding
- Negative: Must enforce tenant_id in every query
- Risk: Data leak → mitigate with query middleware

---

## Denormalization Decision Template

```markdown
## Denormalized Field: [table.column]

**Source**: [Original location of truth]

**Reason**: [Why denormalized - performance, query simplicity]

**Sync Method**: 
- [ ] Trigger
- [ ] Application code
- [ ] Scheduled job

**Staleness Tolerance**: [Immediate | Minutes | Hours]

**Recovery Procedure**: [How to fix if out of sync]

**Monitoring**: [How to detect drift]
```

---

## Migration Checklist Template

```markdown
## Migration: [Description]

**Risk Level**: [Low | Medium | High]

**Rollback Plan**: [How to reverse]

### Pre-Migration
- [ ] Backup taken
- [ ] Tested on production-size data
- [ ] Estimated duration: [X minutes]
- [ ] Maintenance window scheduled (if needed)

### Steps
1. [Step with expected duration]
2. [Step]

### Post-Migration
- [ ] Verify data integrity
- [ ] Check application functionality
- [ ] Monitor for errors

### Rollback Steps (if needed)
1. [Step]
```
