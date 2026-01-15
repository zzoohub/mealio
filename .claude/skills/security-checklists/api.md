# API Security

## Input Validation

| Check | Why |
|-------|-----|
| Schema validation on all inputs | Unexpected data types, injection |
| Explicit type coercion | Type confusion attacks |
| Size limits on strings, arrays, files | DoS, buffer issues |
| Reject unexpected fields | Mass assignment via extra fields |

**Patterns to catch:**
- Request body used directly without validation
- No max length on string fields
- Dynamic field names from user input

---

## Mass Assignment

| Check | Why |
|-------|-----|
| Explicit allowlist of updatable fields | Privilege escalation via hidden fields |
| Separate DTOs for create/update | Different allowed fields per operation |
| Role-based field restrictions | Admin fields writable by regular users |

**Patterns to catch:**
- Full request body spread into model update
- Same input DTO for user and admin endpoints
- Fields like `role`, `isAdmin`, `balance` not explicitly blocked

---

## Data Exposure

| Check | Why |
|-------|-----|
| Response contains only needed fields | Sensitive data leakage |
| No internal IDs/metadata leaked | Information disclosure |
| Error messages sanitized | Stack traces reveal internals |
| Pagination on list endpoints | DoS via large responses |

**Patterns to catch:**
- Full database object in response
- Stack traces in production error responses
- List endpoint returns all records without limit

---

## GraphQL Specific

| Check | Why |
|-------|-----|
| Introspection disabled in production | Schema disclosure |
| Query depth limiting | Nested query DoS |
| Query complexity analysis | Resource exhaustion |
| Field-level authorization | Data access bypass |

**Patterns to catch:**
- `__schema` query enabled in production
- Deeply nested queries without limit
- Same resolver for public and private fields

---

## File Upload

| Check | Why |
|-------|-----|
| Validate type by content, not extension | Extension spoofing |
| Size limits enforced | Storage DoS |
| Filename sanitized | Path traversal |
| Stored outside webroot or with random names | Direct execution |

**Patterns to catch:**
- Extension-only validation
- User-provided filename used directly in path
- Uploads stored in publicly accessible directory with original names
- No content-type verification

---

## CORS & Headers

| Check | Why |
|-------|-----|
| Specific origins, no wildcard with credentials | Cross-origin attacks |
| Security headers set (CSP, HSTS, X-Frame-Options) | XSS, clickjacking |
| Content-Type enforced | MIME sniffing attacks |

**Patterns to catch:**
- `Access-Control-Allow-Origin: *` with credentials
- Missing Content-Security-Policy
- Missing X-Frame-Options

---

## Rate Limiting & DoS Prevention

| Check | Why |
|-------|-----|
| Global rate limits | Resource exhaustion |
| Per-endpoint limits for expensive operations | Targeted DoS |
| Request size limits | Memory exhaustion |
| Timeout on long-running operations | Thread/connection exhaustion |

**Patterns to catch:**
- No rate limiting middleware
- Expensive operations (export, report) without limits
- Regex patterns vulnerable to ReDoS (catastrophic backtracking)
