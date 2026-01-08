# REST API Patterns

Detailed patterns for REST API design.

## URL Structure

### Resource Naming

```
# Collections (plural)
/users
/orders
/products

# Singleton resource
/users/{id}
/users/{id}/profile    (1:1 relationship)

# Sub-collections
/users/{id}/orders     (user's orders)
/orders/{id}/items     (order's items)
```

### Naming Conventions

| Convention | Example | Use |
|------------|---------|-----|
| kebab-case | `/order-items` | Multi-word resources |
| Plural nouns | `/users` not `/user` | Collections |
| Lowercase | `/users` not `/Users` | Always |

### Actions on Resources

When CRUD isn't enough, use sub-resources for actions:

```
# State transitions
POST /orders/{id}/cancel
POST /orders/{id}/ship
POST /users/{id}/verify-email

# Batch operations
POST /emails/send-batch
POST /users/bulk-import

# Computed/derived resources
GET /users/{id}/permissions
GET /orders/{id}/invoice
```

---

## Request/Response Patterns

### Create (POST)

```
Request:
POST /users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}

Response:
201 Created
Location: /users/123

{
  "id": "123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Read (GET)

```
# Single resource
GET /users/123
→ 200 OK with resource
→ 404 Not Found if doesn't exist

# Collection
GET /users
→ 200 OK with paginated list (never 404 for empty)

# With expansion
GET /orders/123?expand=user,items
→ 200 OK with nested related resources
```

### Update (PUT/PATCH)

```
# PUT - Full replacement
PUT /users/123
{
  "email": "new@example.com",
  "name": "Jane Doe",
  "phone": null           # Must include all fields
}
→ 200 OK with updated resource

# PATCH - Partial update
PATCH /users/123
{
  "name": "Jane Doe"      # Only changed fields
}
→ 200 OK with updated resource
```

### Delete (DELETE)

```
DELETE /users/123
→ 204 No Content (success, no body)
→ 404 Not Found (resource doesn't exist)
→ 409 Conflict (can't delete due to dependencies)
```

---

## Pagination Patterns

### Offset Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": true
  },
  "links": {
    "self": "/users?page=2&page_size=20",
    "first": "/users?page=1&page_size=20",
    "prev": "/users?page=1&page_size=20",
    "next": "/users?page=3&page_size=20",
    "last": "/users?page=8&page_size=20"
  }
}
```

### Cursor Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "eyJpZCI6MTQzLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNSJ9"
  },
  "links": {
    "next": "/users?limit=20&cursor=eyJpZCI6MTQz..."
  }
}
```

### Link Header (RFC 5988)

```
Link: <https://api.example.com/users?page=3>; rel="next",
      <https://api.example.com/users?page=1>; rel="prev",
      <https://api.example.com/users?page=1>; rel="first",
      <https://api.example.com/users?page=8>; rel="last"
```

---

## Filtering Patterns

### Simple Equality

```
GET /users?status=active
GET /users?role=admin&status=active
```

### Operators

```
# Comparison
GET /products?price[gte]=100
GET /products?price[lte]=500
GET /products?price[gt]=100&price[lt]=500

# Common operators
[eq]   - Equal (default)
[ne]   - Not equal
[gt]   - Greater than
[gte]  - Greater than or equal
[lt]   - Less than
[lte]  - Less than or equal
[in]   - In list
[nin]  - Not in list
[like] - Pattern match
```

### Multiple Values

```
# OR within field
GET /orders?status[in]=pending,confirmed,shipped

# AND across fields
GET /orders?status=pending&user_id=123
```

### Date Filtering

```
GET /orders?created_at[gte]=2024-01-01
GET /orders?created_at[gte]=2024-01-01&created_at[lt]=2024-02-01
```

---

## Sorting Patterns

### Single Field

```
GET /users?sort=created_at       # Ascending (default)
GET /users?sort=-created_at      # Descending (prefix -)
```

### Multiple Fields

```
GET /users?sort=status,-created_at
# First by status ASC, then by created_at DESC
```

### Alternative Syntax

```
# Explicit direction
GET /users?sort_by=created_at&sort_dir=desc

# Array syntax
GET /users?sort[]=status&sort[]=-created_at
```

---

## Expansion/Embedding

### Expand Related Resources

```
GET /orders/123?expand=user
→ {
    "id": "123",
    "user_id": "456",
    "user": {
      "id": "456",
      "name": "John Doe"
    }
  }

GET /orders/123?expand=user,items
→ Includes both user and items
```

### Sparse Fieldsets

```
GET /users?fields=id,name,email
→ Returns only specified fields

GET /orders?fields=id,total&expand=user&fields[user]=id,name
→ Sparse fields on expanded resources too
```

---

## Bulk Operations

### Batch Create

```
POST /users/batch

{
  "items": [
    {"email": "user1@example.com", "name": "User 1"},
    {"email": "user2@example.com", "name": "User 2"}
  ]
}

Response:
{
  "results": [
    {"index": 0, "status": "created", "data": {"id": "123", ...}},
    {"index": 1, "status": "failed", "error": {"code": "DUPLICATE", "message": "Email exists"}}
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

### Batch Update

```
PATCH /users/batch

{
  "items": [
    {"id": "123", "status": "active"},
    {"id": "456", "status": "inactive"}
  ]
}
```

### Batch Delete

```
DELETE /users/batch?ids=123,456,789

# or
POST /users/batch-delete
{
  "ids": ["123", "456", "789"]
}
```

---

## HATEOAS (Hypermedia)

### Links in Response

```json
{
  "id": "123",
  "status": "pending",
  "total": 99.99,
  "_links": {
    "self": {"href": "/orders/123"},
    "user": {"href": "/users/456"},
    "cancel": {"href": "/orders/123/cancel", "method": "POST"},
    "items": {"href": "/orders/123/items"}
  }
}
```

### Collection Links

```json
{
  "data": [...],
  "_links": {
    "self": {"href": "/orders?page=2"},
    "next": {"href": "/orders?page=3"},
    "prev": {"href": "/orders?page=1"},
    "create": {"href": "/orders", "method": "POST"}
  }
}
```

---

## Conditional Requests

### ETag for Optimistic Locking

```
# Get resource with ETag
GET /users/123
ETag: "a1b2c3d4"

# Update only if unchanged
PUT /users/123
If-Match: "a1b2c3d4"
→ 200 OK (if ETag matches)
→ 412 Precondition Failed (if changed)
```

### Last-Modified

```
GET /users/123
Last-Modified: Tue, 15 Jan 2024 10:30:00 GMT

# Conditional request
GET /users/123
If-Modified-Since: Tue, 15 Jan 2024 10:30:00 GMT
→ 200 OK with body (if modified)
→ 304 Not Modified (if unchanged)
```

---

## Long-Running Operations

### Async Pattern

```
# Start operation
POST /reports/generate
{
  "type": "sales",
  "date_range": "2024-Q1"
}

Response:
202 Accepted
Location: /jobs/789

{
  "job_id": "789",
  "status": "pending",
  "status_url": "/jobs/789"
}

# Poll for completion
GET /jobs/789
→ {"status": "processing", "progress": 45}
→ {"status": "completed", "result_url": "/reports/abc123"}
```

### Webhook Callback

```
POST /reports/generate
{
  "type": "sales",
  "callback_url": "https://myapp.com/webhooks/report-ready"
}

# Server calls callback when done
POST https://myapp.com/webhooks/report-ready
{
  "job_id": "789",
  "status": "completed",
  "result_url": "/reports/abc123"
}
```

---

## Health Endpoints

### Basic Health

```
GET /health
→ 200 OK
{
  "status": "healthy"
}
```

### Detailed Health

```
GET /health/detailed
→ 200 OK
{
  "status": "healthy",
  "version": "1.2.3",
  "checks": {
    "database": {"status": "healthy", "latency_ms": 5},
    "cache": {"status": "healthy", "latency_ms": 1},
    "external_api": {"status": "degraded", "latency_ms": 2500}
  }
}
```

### Readiness vs Liveness

```
GET /health/live    → Is the process running?
GET /health/ready   → Can it serve traffic?
```
