# API Design Examples

Full request/response examples for common patterns.

---

## CRUD Operations

### Create (POST)

```http
POST /users HTTP/2
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com"
}
```

```http
HTTP/2 201 Created
Location: /users/123
Content-Type: application/json

{
  "data": {
    "id": 123,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "createdAt": "2024-10-24T12:00:00Z"
  }
}
```

### Read Single (GET)

```http
GET /users/123 HTTP/2
```

```http
HTTP/2 200 OK
ETag: "9f62089e"
Content-Type: application/json

{
  "data": {
    "id": 123,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "createdAt": "2024-10-24T12:00:00Z"
  }
}
```

### Read Collection (GET)

```http
GET /users?role=admin&limit=20 HTTP/2
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": [
    { "id": 123, "name": "Ada Lovelace", "email": "ada@example.com" },
    { "id": 124, "name": "Grace Hopper", "email": "grace@example.com" }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "nextCursor": "eyJpZCI6MTQ0fQ=="
  }
}
```

### Update (PUT/PATCH)

```http
PATCH /users/123 HTTP/2
Content-Type: application/json

{
  "name": "Ada Byron Lovelace"
}
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": {
    "id": 123,
    "name": "Ada Byron Lovelace",
    "email": "ada@example.com",
    "createdAt": "2024-10-24T12:00:00Z",
    "updatedAt": "2024-10-25T09:30:00Z"
  }
}
```

### Delete (DELETE)

```http
DELETE /users/123 HTTP/2
```

```http
HTTP/2 204 No Content
```

---

## Error Responses (RFC 9457)

### Validation Error (422)

```http
POST /users HTTP/2
Content-Type: application/json

{
  "name": ""
}
```

```http
HTTP/2 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "One or more fields failed validation",
  "instance": "/users",
  "errors": [
    {
      "field": "name",
      "code": "min_length",
      "message": "Name must be at least 1 character"
    },
    {
      "field": "email",
      "code": "required",
      "message": "Email is required"
    }
  ],
  "requestId": "req_abc123"
}
```

### Not Found (404)

```http
GET /users/999 HTTP/2
```

```http
HTTP/2 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with id '999' does not exist",
  "instance": "/users/999",
  "requestId": "req_def456"
}
```

### Conflict (409)

```http
POST /users HTTP/2
Content-Type: application/json

{
  "email": "ada@example.com"
}
```

```http
HTTP/2 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/duplicate",
  "title": "Resource Already Exists",
  "status": 409,
  "detail": "A user with email 'ada@example.com' already exists",
  "instance": "/users",
  "requestId": "req_ghi789"
}
```

### Unauthorized (401)

```http
GET /users/me HTTP/2
```

```http
HTTP/2 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer

{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Authentication Required",
  "status": 401,
  "detail": "Valid authentication token is required",
  "instance": "/users/me",
  "requestId": "req_jkl012"
}
```

### Rate Limited (429)

```http
HTTP/2 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699900030

{
  "type": "https://api.example.com/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Try again in 30 seconds",
  "instance": "/users",
  "requestId": "req_mno345"
}
```

---

## Pagination

### Cursor-based

```http
GET /posts?limit=10&cursor=eyJpZCI6MTAwfQ== HTTP/2
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": [
    { "id": 101, "title": "Post 101" },
    { "id": 102, "title": "Post 102" }
  ],
  "meta": {
    "limit": 10,
    "nextCursor": "eyJpZCI6MTEwfQ==",
    "prevCursor": "eyJpZCI6MTAwfQ==",
    "hasMore": true
  }
}
```

### Offset-based

```http
GET /posts?page=3&limit=10 HTTP/2
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": [...],
  "meta": {
    "page": 3,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  }
}
```

---

## Filtering & Sorting

### Multiple Filters

```http
GET /products?category=electronics&minPrice=100&maxPrice=500&inStock=true HTTP/2
```

### Sorting

```http
GET /products?sort=-createdAt,name HTTP/2
```

`-` prefix = descending, no prefix = ascending

### Field Selection

```http
GET /users/123?fields=id,name,email HTTP/2
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": {
    "id": 123,
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  }
}
```

---

## Caching

### Conditional Request (ETag)

```http
GET /users/123 HTTP/2
If-None-Match: "9f62089e"
```

```http
HTTP/2 304 Not Modified
ETag: "9f62089e"
```

### Cache Headers

```http
HTTP/2 200 OK
Cache-Control: public, max-age=3600
ETag: "9f62089e"
Last-Modified: Wed, 24 Oct 2024 12:00:00 GMT
Vary: Accept, Authorization
```

---

## Authentication

### Bearer Token

```http
GET /users/me HTTP/2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key

```http
GET /data HTTP/2
X-API-Key: sk_live_abc123def456
```

---

## Async Operations (202)

### Start Async Job

```http
POST /videos/123/encode HTTP/2
```

```http
HTTP/2 202 Accepted
Location: /jobs/456
Content-Type: application/json

{
  "data": {
    "jobId": 456,
    "status": "pending",
    "estimatedCompletion": "2024-10-24T12:05:00Z"
  }
}
```

### Poll Job Status

```http
GET /jobs/456 HTTP/2
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": {
    "jobId": 456,
    "status": "completed",
    "result": {
      "videoUrl": "https://cdn.example.com/videos/123.mp4"
    }
  }
}
```

---

## Bulk Operations

```http
POST /users/batch HTTP/2
Content-Type: application/json

{
  "operations": [
    { "method": "create", "data": { "name": "User 1", "email": "u1@example.com" } },
    { "method": "create", "data": { "name": "User 2", "email": "u2@example.com" } },
    { "method": "delete", "id": 999 }
  ]
}
```

```http
HTTP/2 200 OK
Content-Type: application/json

{
  "data": {
    "results": [
      { "status": 201, "data": { "id": 124, "name": "User 1" } },
      { "status": 201, "data": { "id": 125, "name": "User 2" } },
      { "status": 404, "error": { "message": "User 999 not found" } }
    ],
    "summary": {
      "total": 3,
      "succeeded": 2,
      "failed": 1
    }
  }
}
```
