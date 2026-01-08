---
name: api-design
description: REST and GraphQL API design principles for building intuitive, scalable APIs. Covers resource modeling, HTTP semantics, error handling, pagination, versioning, and schema design. Language-agnostic. Use when designing APIs or establishing API standards.
---

# API Design Principles

Language-agnostic principles for designing intuitive, scalable, and maintainable APIs.

## 1. REST API Design

### Resource-Oriented Thinking

**Resources are nouns, not verbs:**

```
# Good - Resources
GET    /users
POST   /users
GET    /users/{id}
PATCH  /users/{id}
DELETE /users/{id}

# Bad - RPC-style
POST   /getUser
POST   /createUser
POST   /deleteUser
```

**Nested vs flat resources:**

```
# Shallow nesting (preferred)
GET /users/{id}/orders     → User's orders
GET /orders/{id}           → Order by ID

# Avoid deep nesting
GET /users/{id}/orders/{orderId}/items/{itemId}/reviews
# Better: /order-items/{id}/reviews
```

### HTTP Methods Semantics

| Method | Purpose | Idempotent | Safe | Request Body |
|--------|---------|------------|------|--------------|
| GET | Retrieve resource(s) | Yes | Yes | No |
| POST | Create resource | No | No | Yes |
| PUT | Replace entire resource | Yes | No | Yes |
| PATCH | Partial update | Yes* | No | Yes |
| DELETE | Remove resource | Yes | No | No |

*PATCH is idempotent if applying same patch yields same result.

**PUT vs PATCH:**
- PUT: Send complete resource, replaces entirely
- PATCH: Send only changed fields, partial update

### Status Codes

**Success (2xx):**
| Code | Use When |
|------|----------|
| 200 OK | GET success, PUT/PATCH success |
| 201 Created | POST created new resource |
| 204 No Content | DELETE success, no body needed |

**Client Errors (4xx):**
| Code | Use When |
|------|----------|
| 400 Bad Request | Malformed syntax, invalid JSON |
| 401 Unauthorized | Missing or invalid authentication |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | State conflict (duplicate, version mismatch) |
| 422 Unprocessable Entity | Validation errors (valid syntax, invalid data) |
| 429 Too Many Requests | Rate limit exceeded |

**Server Errors (5xx):**
| Code | Use When |
|------|----------|
| 500 Internal Server Error | Unexpected server error |
| 503 Service Unavailable | Temporary downtime, maintenance |

### Error Response Format

Standardize error responses across all endpoints:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "not-an-email"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error code taxonomy:**
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Permission denied
- `CONFLICT` - State conflict
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## 2. Pagination

### Offset-Based Pagination

```
GET /users?page=2&page_size=20

Response:
{
  "items": [...],
  "pagination": {
    "page": 2,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

**Pros:** Simple, supports "jump to page N"
**Cons:** Inconsistent with concurrent writes, slow for large offsets

### Cursor-Based Pagination

```
GET /users?limit=20&cursor=eyJpZCI6MTIzfQ

Response:
{
  "items": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTQzfQ",
    "has_more": true
  }
}
```

**Pros:** Consistent with concurrent writes, performant for large datasets
**Cons:** Can't jump to arbitrary page

### When to Use Which

| Use Case | Pattern |
|----------|---------|
| Admin tables with page numbers | Offset |
| Infinite scroll, feeds | Cursor |
| Large datasets (>100K rows) | Cursor |
| Need "page X of Y" display | Offset |
| Real-time data with frequent writes | Cursor |

---

## 3. Filtering, Sorting, Searching

### Query Parameters

```
# Filtering
GET /users?status=active
GET /users?status=active&role=admin
GET /orders?created_after=2024-01-01

# Sorting
GET /users?sort=created_at          (ascending)
GET /users?sort=-created_at         (descending)
GET /users?sort=status,-created_at  (multiple)

# Searching
GET /users?search=john
GET /users?q=john

# Field selection (sparse fieldsets)
GET /users?fields=id,name,email
```

### Filter Operators

For complex filtering, consider operator syntax:

```
GET /products?price[gte]=100&price[lte]=500
GET /users?created_at[after]=2024-01-01
GET /orders?status[in]=pending,confirmed
```

---

## 4. Versioning

### Strategies Comparison

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL Path | `/v1/users` | Explicit, easy to route | URL changes per version |
| Header | `Accept: application/vnd.api.v1+json` | Clean URLs | Less visible |
| Query Param | `/users?version=1` | Easy testing | Can be forgotten |

**Recommendation:** URL path versioning for public APIs (explicit and cacheable).

### Breaking vs Non-Breaking Changes

**Non-breaking (no version bump):**
- Adding new optional fields
- Adding new endpoints
- Adding new optional parameters

**Breaking (requires new version):**
- Removing or renaming fields
- Changing field types
- Removing endpoints
- Changing required parameters

---

## 5. Authentication & Authorization

### Token Patterns

**Bearer Token (JWT, etc.):**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**API Key:**
```
X-API-Key: sk_live_abc123
# or
Authorization: ApiKey sk_live_abc123
```

### Auth Response Codes

| Situation | Status Code |
|-----------|-------------|
| No token provided | 401 Unauthorized |
| Invalid/expired token | 401 Unauthorized |
| Valid token, no permission | 403 Forbidden |
| Resource doesn't exist (even if no access) | 404 Not Found* |

*Return 404 instead of 403 to avoid revealing resource existence.

---

## 6. Rate Limiting

### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1640000000

# When limited:
429 Too Many Requests
Retry-After: 3600
```

### Rate Limit Strategies

| Strategy | Description |
|----------|-------------|
| Per User | Limits per authenticated user |
| Per IP | Limits per IP address |
| Per Endpoint | Different limits per endpoint |
| Sliding Window | Rolling time window |
| Token Bucket | Allows burst within limits |

---

## 7. Idempotency

For non-idempotent operations (POST), use idempotency keys:

```
POST /orders
Idempotency-Key: unique-client-generated-key

# Server behavior:
# - First request: Process and store result with key
# - Duplicate request: Return stored result
```

**Use when:**
- Payment processing
- Order creation
- Any operation that shouldn't duplicate on retry

---

## 8. Caching

### Cache Headers

```
# Cacheable response
Cache-Control: public, max-age=3600

# No caching
Cache-Control: no-cache, no-store, must-revalidate

# Conditional requests
ETag: "33a64df551425fcc"
If-None-Match: "33a64df551425fcc"
→ 304 Not Modified (if unchanged)
```

### Cacheability by Method

| Method | Cacheable |
|--------|-----------|
| GET | Yes |
| HEAD | Yes |
| POST | No (usually) |
| PUT/PATCH/DELETE | No |

---

## 9. GraphQL Design

### Schema Design Principles

**Type Design:**
```graphql
type User {
  id: ID!
  email: String!          # Required
  phone: String           # Optional (nullable)
  posts: [Post!]!         # Non-null list of non-null items
}
```

**Input Types for Mutations:**
```graphql
input CreateUserInput {
  email: String!
  name: String!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}
```

**Payload Pattern for Errors:**
```graphql
type CreateUserPayload {
  user: User
  errors: [Error!]
  success: Boolean!
}

type Error {
  field: String
  message: String!
  code: String!
}
```

### Pagination (Relay-style)

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### N+1 Problem Prevention

Always use DataLoader pattern for relationships:
- Batch multiple requests into single query
- Cache within single request
- Essential for any production GraphQL API

### Query Complexity Protection

| Protection | Purpose |
|------------|---------|
| Depth Limiting | Prevent deeply nested queries |
| Complexity Analysis | Limit computational cost |
| Timeout | Kill long-running queries |

---

## 10. API Design Checklist

### Resource Design
- [ ] Resources are nouns (not verbs)
- [ ] Consistent plural naming (`/users` not `/user`)
- [ ] Logical nesting (max 2 levels deep)
- [ ] Clear relationship representation

### HTTP Semantics
- [ ] Correct methods (GET reads, POST creates, etc.)
- [ ] Appropriate status codes
- [ ] Idempotent operations are truly idempotent

### Error Handling
- [ ] Consistent error format
- [ ] Meaningful error codes
- [ ] Helpful error messages (without leaking internals)
- [ ] Validation errors include field names

### Pagination & Filtering
- [ ] All list endpoints paginated
- [ ] Reasonable default page size
- [ ] Maximum page size enforced
- [ ] Filtering on common fields
- [ ] Sorting options

### Security
- [ ] Authentication required where needed
- [ ] Authorization checked per resource
- [ ] Rate limiting configured
- [ ] No sensitive data in URLs

### Documentation
- [ ] All endpoints documented
- [ ] Request/response examples
- [ ] Error codes explained
- [ ] Authentication explained

---

## 11. Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Verbs in URLs | `/getUsers`, `/createOrder` | Use HTTP methods + nouns |
| Inconsistent naming | `/users` vs `/Product` | Pick convention, enforce |
| 200 for errors | `{status: 200, error: "..."}` | Use proper status codes |
| Exposing internal IDs | Sequential IDs leak info | Use UUIDs for public APIs |
| No pagination | Returns 10K items | Always paginate lists |
| Breaking changes silently | Clients break | Version or deprecate |
| Leaking stack traces | Security risk | Generic 500 messages |

---

See [REST-PATTERNS.md](REST-PATTERNS.md) for detailed REST patterns.
See [GRAPHQL-PATTERNS.md](GRAPHQL-PATTERNS.md) for detailed GraphQL patterns.
