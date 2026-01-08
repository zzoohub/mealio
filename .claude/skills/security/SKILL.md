---
name: security
description: Security best practices for web/mobile apps. Covers authentication (JWT, passwords, cookies), authorization (RBAC, IDOR), input validation (SQL injection, XSS), security headers, CORS, and secrets management. Use when implementing auth, reviewing vulnerabilities, or hardening applications.
---

# Security

Security guidelines for web and mobile applications.

## Quick Reference

| Topic | Key Points |
|-------|------------|
| Passwords | bcrypt, 12+ rounds, never MD5/SHA |
| JWT | Short-lived access (15m), separate refresh secret |
| Cookies | httpOnly, secure, sameSite: strict |
| SQL | Always parameterized queries |
| XSS | Sanitize HTML, use framework escaping |

## Authentication

### Password Hashing

```typescript
// ✅ bcrypt with 12+ rounds
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);
```

```python
# ✅ Python - passlib
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash = pwd_context.hash(password)
valid = pwd_context.verify(password, hash)
```

**Never use**: MD5, SHA1, SHA256 for passwords.

### JWT Setup

```typescript
// Access: 15m, Refresh: 7d, separate secrets
const accessToken = jwt.sign(
  { sub: userId, type: "access" },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);
```

**Bad practices**: Hardcoded secrets, 365d expiry, `algorithms: ["none"]`.

### Secure Cookies

```typescript
res.cookie("session", sessionId, {
  httpOnly: true,     // No JS access
  secure: true,       // HTTPS only
  sameSite: "strict", // CSRF protection
  maxAge: 86400000,   // 24h
});
```

### Rate Limiting

```typescript
// 5 attempts per 15min on auth endpoints
import rateLimit from "express-rate-limit";
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip + req.body?.email,
});
app.post("/api/auth/login", authLimiter, handler);
```

## Authorization

### IDOR Prevention

```typescript
// ✅ Always verify ownership
app.get("/api/users/:id", authenticate, async (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // proceed...
});
```

### Role-Based Access

```typescript
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
app.delete("/api/users/:id", authenticate, requireRole("admin"), handler);
```

## Input Validation

### SQL Injection Prevention

```typescript
// ❌ Bad
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Good - parameterized
const query = "SELECT * FROM users WHERE email = $1";
db.query(query, [email]);

// ✅ Good - ORM
const user = await prisma.user.findUnique({ where: { email } });
```

### XSS Prevention

```typescript
// ❌ Bad
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Good - sanitize
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ✅ Best - let React escape
<div>{userContent}</div>
```

### Validation with Zod

```typescript
import { z } from "zod";
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const result = userSchema.safeParse(req.body);
if (!result.success) return res.status(400).json({ error: result.error });
```

### File Upload

```typescript
import { fileTypeFromBuffer } from "file-type";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

async function validateUpload(file: Buffer) {
  if (file.length > MAX_SIZE) throw new Error("Too large");
  const type = await fileTypeFromBuffer(file);
  if (!type || !ALLOWED.includes(type.mime)) throw new Error("Invalid type");
}
```

## Security Headers

### Express (Helmet)

```typescript
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));
```

### Next.js

See [HEADERS.md](HEADERS.md) for complete Next.js security headers configuration.

## CORS

```typescript
// ❌ Bad
app.use(cors({ origin: "*" }));

// ✅ Good - explicit origins
const allowed = ["https://myapp.com"];
if (process.env.NODE_ENV === "development") allowed.push("http://localhost:3000");

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true,
}));
```

## Secrets Management

```typescript
// Validate at startup
import { z } from "zod";
const env = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
}).parse(process.env);
```

```gitignore
# .gitignore - never commit secrets
.env
.env.local
*.pem
*.key
```

## Error Handling

```typescript
// ✅ Safe - log internally, return generic message
app.use((err, req, res, next) => {
  console.error("Error:", err.message, err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : err.message,
  });
});
```

## React Native

```typescript
// ❌ Bad - AsyncStorage not encrypted
await AsyncStorage.setItem("token", accessToken);

// ✅ Good - use secure storage
import * as SecureStore from "expo-secure-store";
await SecureStore.setItemAsync("token", accessToken);
```

**Never**: Bundle API keys in app code.

## Detailed References

- **[HEADERS.md](HEADERS.md)**: Complete security headers for Next.js
- **[FASTAPI.md](FASTAPI.md)**: Python/FastAPI security patterns
- **[CHECKLIST.md](CHECKLIST.md)**: Pre-deployment security checklist

## External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Helmet.js](https://helmetjs.github.io/)
