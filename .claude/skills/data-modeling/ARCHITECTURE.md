# Architecture Documentation

Templates for documenting data model decisions.

## Database Architecture Document Template

```markdown
# [Project Name] Database Architecture

## Overview
[One paragraph: What does this database support? What's the bounded context?]

## Design Principles
1. [Principle, e.g., "Soft deletes for all user-generated content"]
2. [Principle, e.g., "UTC timestamps everywhere"]
3. [Principle, e.g., "Tenant isolation via tenant_id on all tables"]

## Entity Overview

| Entity | Purpose | Owner | Estimated Volume |
|--------|---------|-------|------------------|
| users | User accounts | Auth team | 100K in year 1 |
| posts | User content | Content team | 1M in year 1 |

## Entity Details

### [Entity Name]

**Purpose:** [What this entity represents]

**Owner:** [Team/service responsible]

**Key Design Decisions:**
- [Decision]: [Rationale]
- [Decision]: [Rationale]

**Access Patterns:**
- [Query description] - [Frequency]
- [Query description] - [Frequency]

**Growth Considerations:**
- Current estimate: [X rows]
- 2-year estimate: [Y rows]
- Mitigation: [Strategy if needed]

## Relationships

| From | To | Type | On Delete | Rationale |
|------|-----|------|-----------|-----------|
| posts | users | N:1 | CASCADE | Posts meaningless without author |
| posts | tags | N:M | CASCADE | Remove associations only |

## Denormalization Log

| Location | Source | Sync Method | Staleness Tolerance | Recovery |
|----------|--------|-------------|---------------------|----------|
| posts.comments_count | COUNT(comments) | Trigger | 0 (immediate) | Recount script |
| users.posts_count | COUNT(posts) | Application | 1 hour | Nightly job |

## Indexing Strategy

| Index | Supports Query | Estimated Size |
|-------|----------------|----------------|
| posts(user_id) | User's posts | 10MB |
| posts(created_at) | Recent posts | 10MB |

## Partitioning Strategy

| Table | Strategy | Key | When to Implement |
|-------|----------|-----|-------------------|
| events | Range by month | created_at | >100M rows |
| orders | Range by year | order_date | >50M rows |

## Security Considerations

**PII Columns:**
- users.email
- users.phone
- user_profiles.address

**Row-Level Security:**
- Users see only their own data
- Admins see all within tenant

**Encryption:**
- [At rest / in transit / column-level needs]

## Migration Guidelines

- All migrations must be reversible
- Large data migrations: batch by 10K rows
- Column renames: expand-contract pattern
- Zero-downtime requirements: [Yes/No]
```

---

## Architecture Decision Record (ADR) Template

For individual design decisions that need detailed rationale.

```markdown
# ADR-[NUMBER]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
[What is the issue? What forces are at play?]

## Decision
[What is the decision that was made?]

## Alternatives Considered

### Option A: [Name]
- Pros: [...]
- Cons: [...]

### Option B: [Name]
- Pros: [...]
- Cons: [...]

## Consequences

### Positive
- [Consequence]

### Negative
- [Consequence]

### Risks
- [Risk and mitigation]

## References
- [Links to relevant docs, discussions]
```

---

## Example ADRs

### ADR-001: Soft Delete Strategy

**Status:** Accepted

**Context:**
We need to handle data deletion for user-generated content. Regulatory requirements mandate 90-day retention. Users expect "undo" functionality.

**Decision:**
Implement soft deletes using `deleted_at` timestamp column for: posts, comments, messages. Hard delete for: sessions, temporary tokens.

**Alternatives Considered:**

Option A: Hard delete everything
- Pros: Simple, GDPR compliant
- Cons: No undo, no audit trail, breaks referential integrity

Option B: Archive tables
- Pros: Clean separation
- Cons: Complex queries for "with deleted", expensive moves

**Consequences:**
- Positive: Undo possible, audit trail preserved
- Negative: All queries must include `deleted_at IS NULL`
- Risk: Forgotten filter exposes deleted data → Mitigate with query builder defaults

---

### ADR-002: ID Strategy

**Status:** Accepted

**Context:**
Need globally unique identifiers. System will be distributed across regions. IDs may be exposed in URLs.

**Decision:**
Use UUIDv7 for all primary keys.

**Alternatives Considered:**

Option A: Auto-increment BIGINT
- Pros: Compact, fast, sortable
- Cons: Predictable (security), requires coordination (distributed)

Option B: UUIDv4
- Pros: Globally unique, no coordination
- Cons: Random = poor index locality, not sortable

Option C: UUIDv7 (chosen)
- Pros: Globally unique, time-sortable, good index locality
- Cons: Larger than BIGINT (16 bytes)

**Consequences:**
- Positive: No ID conflicts across regions, natural time ordering
- Negative: Larger storage, slightly slower JOINs
- Risk: Library support varies → Use well-maintained library

---

### ADR-003: Multi-Tenancy Approach

**Status:** Accepted

**Context:**
SaaS application with hundreds of tenants. Most tenants are small (<1000 records). Some enterprise tenants are large (>1M records).

**Decision:**
Shared schema with `tenant_id` column on all tables. Row-level security enforced at application layer. Future option to migrate large tenants to dedicated schema.

**Alternatives Considered:**

Option A: Database per tenant
- Pros: Complete isolation
- Cons: Operational complexity, expensive for small tenants

Option B: Schema per tenant
- Pros: Good isolation, shared infrastructure
- Cons: Schema management complexity, migration overhead

Option C: Shared schema (chosen)
- Pros: Simple operations, easy cross-tenant queries (admin)
- Cons: Noisy neighbor risk, security depends on app layer

**Consequences:**
- Positive: Simple deployment, easy onboarding
- Negative: Must be vigilant about tenant_id in every query
- Risk: Data leak if filter forgotten → Mitigate with query middleware
