---
name: rest-api-design
description: |
  REST API design principles, conventions, and patterns.
  Use when: designing APIs, choosing status codes, error handling, caching, auth patterns.
  Do not use for: framework-specific implementation (use fastapi, axum skills).
  Workflow: This skill (design) → fastapi/axum (implementation).
references:
  - examples.md    # Full request/response examples
  - https://www.speakeasy.com/api-design/responses
  - https://strapi.io/blog/rest-api-design-best-practices
---

# API Design

## Resource Naming

**Rule: Model nouns, not verbs. HTTP methods express actions.**

```
# ❌ Verbs in URL
POST /createUser
GET /getUsers

# ✅ RESTful
POST /users
GET /users
DELETE /users/123
```

| Pattern | Example |
|---------|---------|
| Collection | `/users` |
| Single resource | `/users/{id}` |
| Nested (shallow) | `/users/{id}/orders` |
| Filter via query | `/orders?userId=123` |

**Rule: Plural nouns, lowercase, max 2 levels deep.**

```
# ❌ Too deep
/companies/{id}/departments/{id}/users/{id}/orders

# ✅ Flatten
/orders?userId=123
```

---

## HTTP Methods

| Method | Action | Idempotent | Success Code |
|--------|--------|------------|--------------|
| GET | Read | ✅ | 200 |
| POST | Create | ❌ | 201 |
| PUT | Replace | ✅ | 200 |
| PATCH | Partial update | ✅ | 200 |
| DELETE | Remove | ✅ | 204 |

**Rule: Idempotent = safe to retry. POST creates duplicates on retry.**

---

## Status Codes

### Success (2xx)

| Code | When |
|------|------|
| 200 OK | Generic success |
| 201 Created | Resource created + `Location` header |
| 202 Accepted | Async processing started |
| 204 No Content | Success, no body (DELETE) |

### Client Error (4xx)

| Code | When |
|------|------|
| 400 Bad Request | Malformed syntax |
| 401 Unauthorized | No/invalid auth |
| 403 Forbidden | No permission |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Duplicate, state conflict |
| 410 Gone | Permanently deleted |
| 422 Unprocessable | Validation failed |
| 429 Too Many Requests | Rate limited |

### Server Error (5xx)

| Code | When |
|------|------|
| 500 Internal Server Error | Unexpected failure |
| 502 Bad Gateway | Upstream down |
| 503 Service Unavailable | Temporarily unavailable |

**Rule: 4xx = client's fault. 5xx = server's fault (retry later).**

---

## Response Format

### Success

```json
{
  "data": { "id": 123, "name": "Ada" },
  "meta": { "requestId": "abc123" }
}
```

### Error (RFC 9457 Problem Details)

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Email is required",
  "errors": [{ "field": "email", "code": "required" }]
}
```

**Rule: Use `Content-Type: application/problem+json` for errors.**

See `examples.md` for full request/response examples.

---

## Request/Response Consistency

**Rule: Request shape should match response shape.**

Response may have read-only fields (`id`, `createdAt`), but structure must be identical. Never change field types or nesting between request/response.

---

## Pagination

| Type | Use for | Example |
|------|---------|---------|
| Cursor-based | Feeds, timelines, large data | `?cursor=xyz&limit=20` |
| Offset-based | Admin panels, small data | `?page=2&limit=20` |

**Rule: Prefer cursor-based. Offset has performance issues at scale.**

---

## Filtering & Sorting

```
GET /users?role=admin&status=active
GET /users?sort=-createdAt
GET /users?fields=id,name,email
```

**Rule: Filters in query string, not URL path.**

---

## Caching

| Header | Purpose |
|--------|---------|
| `ETag` | Version for conditional requests |
| `Cache-Control` | `public`, `private`, `no-store` |
| `Last-Modified` | Timestamp |

**Rule: Cache public data. `private, no-store` for user-specific.**

---

## Security

| Item | Recommended |
|------|-------------|
| Password hashing | argon2id (64MB, 3 iter, 4 parallel) |
| JWT algorithm | ES256 or EdDSA |
| JWT access token | 15-30 minutes |
| JWT refresh token (web) | 90 days |
| JWT refresh token (mobile) | 1 year |
| TLS | 1.3+ only |
| CORS | Explicit origins only |
| Rate limit (auth) | 5/min |
| Rate limit (API) | 100/min baseline |

| API Type | Auth Pattern |
|----------|--------------|
| User-facing | JWT |
| Public API | API keys, OAuth 2.0 |
| Service-to-service | mTLS |
| Webhooks | HMAC signature |

**Rate limit headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
Retry-After: 30
```

**Rule: Stateless auth enables horizontal scaling. Return `Retry-After` with 429.**

---

## Versioning

```
/v1/users
/v2/users
```

**Rule: Version in URL. Only for breaking changes. Use `Sunset` header for deprecation.**

---

## Quick Checklist

### URL Design
- [ ] Plural nouns, no verbs
- [ ] Max 2 levels nesting
- [ ] Filters in query string

### HTTP
- [ ] Correct methods and status codes
- [ ] 201 + Location for create
- [ ] 204 for delete

### Response
- [ ] Consistent envelope (`data`, `meta`)
- [ ] RFC 9457 for errors
- [ ] Request/response shapes match

### Performance
- [ ] Pagination on collections
- [ ] Cache headers
- [ ] Field selection

### Security
- [ ] HTTPS only
- [ ] Stateless auth
- [ ] Rate limiting
