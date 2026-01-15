# Authentication & Authorization Security

## Password Security

| Check | Why |
|-------|-----|
| Strong adaptive hashing (bcrypt/argon2) | Rainbow tables, GPU cracking |
| No password in logs, errors, responses | Credential leakage |
| Secure reset flow (expiring single-use token) | Account takeover via reset |
| Password change requires current password | Session hijack escalation |

**Patterns to catch:**
- Weak hash algorithms (MD5, SHA1, SHA256 for passwords)
- Password field included in API responses
- Reset tokens that don't expire or are reusable

---

## Session Management

| Check | Why |
|-------|-----|
| Server-side invalidation on logout | Token theft persistence |
| Session ID regeneration after auth state change | Session fixation |
| Concurrent session limits | Account sharing, stolen sessions |
| Idle + absolute timeout | Abandoned session hijack |
| Separate long-lived token for remember-me | Reduced exposure window |

**Patterns to catch:**
- Logout only clears client state, server still accepts token
- Same session ID before and after login
- No mechanism to invalidate all sessions

---

## JWT Security

| Check | Why |
|-------|-----|
| Algorithm explicitly verified | Algorithm confusion attack ("none") |
| Short-lived access tokens | Token theft window |
| Refresh token rotation | Refresh token theft |
| Sensitive claims verified server-side | JWT tampering |

**Patterns to catch:**
- JWT verification without algorithm whitelist
- Long-lived access tokens (hours/days)
- Same refresh token valid after use
- Role/permissions stored only in JWT, not verified against DB

---

## OAuth / SSO

| Check | Why |
|-------|-----|
| State parameter validated | CSRF on OAuth flow |
| PKCE for public clients | Auth code interception |
| Redirect URI strictly validated | Open redirect to steal tokens |
| Token exchange server-side | Token exposure to client |

**Patterns to catch:**
- Missing state parameter check
- Redirect URI from user input without allowlist
- Access token handled in frontend JavaScript

---

## Authorization (Access Control)

| Check | Why |
|-------|-----|
| Ownership verified before data access | IDOR |
| Role check on every protected endpoint | Broken access control |
| Default deny, explicit allow | Forgotten endpoints exposed |
| Indirect references where appropriate | ID enumeration |

**Patterns to catch:**
- Data fetched by ID without ownership check
- Role check only on frontend
- New endpoints inherit no protection by default
- Sequential IDs exposed in URLs

---

## Rate Limiting & Brute Force

| Check | Why |
|-------|-----|
| Strict limit on auth endpoints | Credential stuffing |
| Very strict limit on password reset | Account enumeration |
| Lockout or CAPTCHA after threshold | Automated attacks |
| Timing-safe comparison | Timing-based enumeration |

**Patterns to catch:**
- No rate limit on login/register/reset
- Different error messages for "user not found" vs "wrong password"
- Early return on user lookup failure (timing difference)
