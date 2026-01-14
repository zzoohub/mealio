# Data Modeling Anti-Patterns

Common mistakes and how to avoid them. Check against this list before finalizing any data model.

---

## Entity Design Anti-Patterns

### ❌ God Table

**Problem**: Single table with 50+ columns "for flexibility"

```
entities:
  - id
  - type ("user", "product", "order")
  - name
  - email (only for users)
  - price (only for products)
  - status (means different things per type)
  - field1, field2, field3... (for future use)
```

**Why it's bad**:
- No constraints possible (email required only for users?)
- Sparse data (most columns NULL)
- Confusing queries
- No referential integrity

**Fix**: Separate tables per entity type. Use polymorphic patterns if unified querying needed.

---

### ❌ Entity-Attribute-Value (EAV)

**Problem**: Generic key-value structure instead of proper columns

```
entity_attributes:
  - entity_id
  - attribute_name ("email", "age", "price")
  - attribute_value (everything as string)
```

**Why it's bad**:
- No type safety
- No constraints
- Horrible query performance
- Complex JOINs for simple queries

**When acceptable**: Truly dynamic user-defined fields. But even then, consider JSON column.

**Fix**: Define explicit columns. Use JSON for truly dynamic data.

---

### ❌ No Natural Key

**Problem**: Entity has no business identifier besides surrogate key

```
orders:
  - id (only identifier)
  - user_id
  - total
  -- no order_number!
```

**Why it's bad**:
- Can't reference in external systems
- Hard to communicate ("order 847291847")
- No idempotency key
- Duplicate detection impossible

**Fix**: Every entity needs business identifier.

```
orders:
  - id: PK
  - order_number: unique, human-readable
```

---

## Relationship Anti-Patterns

### ❌ Missing FK Constraints

**Problem**: "We'll enforce in application code"

```
orders:
  - user_id (no FK constraint)
```

**Why it's bad**:
- Orphaned records guaranteed
- Data corruption over time
- Bugs = broken data forever
- No documentation of relationships

**Fix**: Always use FK constraints.

---

### ❌ Circular Dependencies

**Problem**: A requires B, B requires A

```
users:
  - primary_address_id: FK → addresses, NOT NULL

addresses:
  - user_id: FK → users, NOT NULL
```

**Why it's bad**:
- Can't insert either
- Can't delete either
- Transaction complexity

**Fix**: Make one side nullable.

---

### ❌ Implicit Many-to-Many

**Problem**: Storing relationships as comma-separated values

```
posts:
  - tag_ids: "1,5,12,8"
```

**Why it's bad**:
- No referential integrity
- Can't index
- Can't query "posts with tag X" efficiently
- Parsing required

**Fix**: Junction table.

---

## Normalization Anti-Patterns

### ❌ Premature Denormalization

**Problem**: Denormalizing before measuring performance

```
orders:
  - user_email (copied from users)
  - user_name (copied from users)
  - product_count (calculated)
  -- sync problems incoming
```

**Why it's bad**:
- Sync bugs inevitable
- Premature optimization
- Complexity without proof of need

**Fix**: Start normalized. Denormalize after measuring. Document when you do.

---

### ❌ Undocumented Denormalization

**Problem**: Denormalized fields with no sync strategy

```
-- Field exists, but:
-- Where does true value live?
-- How is it synced?
-- What if it drifts?
-- Nobody knows.
```

**Why it's bad**:
- New devs don't know rules
- Bugs during "fixes"
- Data drift undetected
- Recovery impossible

**Fix**: Every denormalized field MUST have documentation. See ARCHITECTURE.md.

---

### ❌ Over-Normalization

**Problem**: 10 JOINs for simple query

```
-- Address split into:
-- addresses, cities, states, countries, postal_codes
-- 5 JOINs to get full address
```

**Why it's bad**:
- Query complexity
- Performance overhead
- Maintenance burden
- No practical benefit

**Fix**: Normalize to 3NF with judgment. Embed stable reference data.

---

## ID Anti-Patterns

### ❌ Mixed ID Strategies

**Problem**: Some BIGINT, some UUID, some SERIAL

**Why it's bad**:
- Inconsistent join patterns
- Confusion
- ORM complexity
- Migration nightmares

**Fix**: Pick ONE. Use everywhere. Document in ADR.

---

### ❌ Meaningful IDs

**Problem**: Encoding business data in IDs

```
order_id = "US-2024-ELECTRONICS-00001"
-- Region, year, category encoded
```

**Why it's bad**:
- What if order moves category?
- What if region changes?
- Parsing required
- ID becomes mutable (danger!)

**Fix**: IDs are opaque. Business data goes in columns.

---

## Timestamp Anti-Patterns

### ❌ No Timestamps

**Problem**: Tables without created_at/updated_at

**Why it's bad**:
- Can't debug "when did this change?"
- Can't build audit trails
- Can't do incremental syncs
- Lost forensics

**Fix**: Always add timestamps on every table.

---

### ❌ Local Timezone Storage

**Problem**: Timestamps in local timezone

```
created_at: TIMESTAMP (no timezone)
-- PST? EST? UTC? Who knows!
```

**Why it's bad**:
- DST ambiguity
- Different servers = different times
- International users = chaos

**Fix**: Always store UTC. Use TIMESTAMPTZ (PostgreSQL) or document UTC convention (SQLite).

---

## Query Anti-Patterns

### ❌ SELECT *

**Problem**: Selecting all columns when you need few

**Why it's bad**:
- Wastes bandwidth
- Schema changes break code
- No index-only scans
- Exposes sensitive columns

**Fix**: Select only what you need.

---

### ❌ Missing Indexes on FKs

**Problem**: Foreign key columns without indexes

**Why it's bad**:
- Slow lookups by FK
- Slow CASCADE operations
- Slow JOINs

**Fix**: Index every FK column.

---

## General Anti-Patterns

### ❌ Future-Proofing

**Problem**: Adding things "we might need someday"

```
users:
  - metadata: JSON (might need it)
  - extra1, extra2, extra3 (for future)
```

**Why it's bad**:
- Clutters schema
- Unclear semantics
- Often never used
- Real needs differ from guesses

**Fix**: Add things when needed. Migrations are cheap.

---

### ❌ Soft Delete Everything

**Problem**: Soft deletes where hard delete is appropriate

```
sessions:
  - deleted_at (why?)
```

**Why it's bad**:
- Table bloat
- Query complexity everywhere
- Some data should just be gone

**Fix**: Soft delete only when justified (audit, undo, retention). Hard delete ephemeral data.

---

### ❌ Ignoring Database Limitations

**Problem**: Designing for PostgreSQL, deploying to SQLite (or vice versa)

**Why it's bad**:
- SQLite: No RLS, limited ALTER, single writer
- PostgreSQL: Requires server, more operational overhead

**Fix**: Choose database first. Design for its capabilities and limitations.

---

## Anti-Pattern Checklist

Before finalizing any model:

- [ ] No God Tables (max ~20 columns per table)
- [ ] No EAV unless truly necessary
- [ ] Every entity has natural/business key
- [ ] All FKs have constraints
- [ ] All FKs have indexes
- [ ] No circular dependencies
- [ ] No comma-separated values for relationships
- [ ] Consistent ID strategy
- [ ] Timestamps on all tables (UTC)
- [ ] No undocumented denormalization
- [ ] No "future-proofing" columns
- [ ] Database choice documented and appropriate
