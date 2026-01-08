# GraphQL Schema Design Patterns

## Type Design

### Nullability

```graphql
type User {
  id: ID!               # Never null
  email: String!        # Required
  phone: String         # Optional (nullable)
  posts: [Post!]!       # Non-null list of non-null items
}
```

**Rule:** Start nullable, make non-null when guaranteed.

### Interfaces & Unions

```graphql
# Interface - shared fields
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  email: String!
}

# Union - different types
union SearchResult = User | Post | Comment

type Query {
  search(query: String!): [SearchResult!]!
}
```

---

## Input Types

```graphql
# Create - required fields
input CreateUserInput {
  email: String!
  name: String!
}

# Update - all optional  
input UpdateUserInput {
  email: String
  name: String
}

# Filter
input UserFilter {
  status: UserStatus
  search: String
  createdAfter: DateTime
}
```

---

## Pagination (Relay Connection)

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

type Query {
  users(first: Int, after: String): UserConnection!
}
```

---

## Mutations

### Input/Payload Pattern

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}

type CreateUserPayload {
  user: User
  errors: [Error!]!
  success: Boolean!
}

type Error {
  field: String
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  VALIDATION_ERROR
  NOT_FOUND
  UNAUTHORIZED
  CONFLICT
}
```

**Why:** Partial success, typed errors, extensible.

### Naming Convention

```graphql
type Mutation {
  createUser: ...     # verb + noun
  updateUser: ...
  deleteUser: ...
  publishPost: ...    # domain action
  cancelOrder: ...
}
```

---

## Subscriptions

```graphql
type Subscription {
  postCreated: Post!
  orderStatusChanged(orderId: ID!): Order!
}

# Event wrapper pattern
type Subscription {
  postEvents: PostEvent!
}

type PostEvent {
  type: PostEventType!  # CREATED, UPDATED, DELETED
  post: Post!
}
```

---

## Field Design

```graphql
type User {
  # Pagination on relationships
  posts(first: Int = 10): PostConnection!
  
  # Computed fields
  fullName: String!           # from firstName + lastName
  postCount: Int!             # count without loading all
  isLikedByViewer: Boolean!   # context-dependent
}
```

---

## Error Handling

### Errors in Payload (Recommended)

```graphql
mutation {
  createUser(input: {email: "invalid"}) {
    user { id }
    errors { field, message, code }
  }
}
# Returns user: null, errors: [{field: "email", ...}]
```

### Union Error Pattern

```graphql
union CreateUserResult = User | ValidationError | ConflictError

type ValidationError {
  field: String!
  message: String!
}
```

Use when different error types need different fields.

---

## Performance

### N+1 Prevention

**Problem:** `users { posts }` → one query per user

**Solution:** DataLoader batches into single query.

### Query Protection

| Strategy | Description |
|----------|-------------|
| Depth limiting | Max nesting (e.g., 10 levels) |
| Complexity scoring | Cost per field, limit total |
| Timeout | Kill slow queries |

---

## Schema Evolution

### Safe Changes (Non-breaking)
- Add new types, fields, optional arguments
- Add enum values

### Breaking Changes (Avoid)
- Remove/rename types or fields
- Change field types
- Remove enum values

### Deprecation

```graphql
type User {
  name: String! @deprecated(reason: "Use firstName/lastName")
  firstName: String!
  lastName: String!
}
```

---

## Custom Scalars

```graphql
scalar DateTime    # ISO 8601
scalar Email       # Validated
scalar URL         # Validated
scalar JSON        # Arbitrary
scalar Money       # Currency
```

---

## Directives

```graphql
# Built-in
field: String @deprecated(reason: "...")
email @include(if: $showEmail)

# Custom
directive @auth(requires: Role = USER) on FIELD_DEFINITION

type Mutation {
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
}
```

---

## Best Practices

| Practice | Recommendation |
|----------|----------------|
| Nullability | Start nullable |
| Input types | Always for mutations |
| Payloads | Return errors, not exceptions |
| Pagination | Relay connections for large data |
| Naming | camelCase fields, PascalCase types |
| DataLoaders | Always for relationships |
| Deprecation | @deprecated before removing |
