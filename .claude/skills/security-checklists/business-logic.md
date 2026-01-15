# Business Logic Security

## Race Conditions

| Check | Why |
|-------|-----|
| Financial operations use transactions + locks | Double-spend, overdraft |
| Inventory changes atomic | Overselling |
| Idempotency keys for sensitive operations | Duplicate submissions |
| Optimistic locking where appropriate | Lost updates |

**Patterns to catch:**
- Check-then-act without atomic operation (read balance → check → update)
- Stock decrement without row lock
- Payment endpoint without idempotency handling
- Concurrent request vulnerability in any state change

---

## Numeric Manipulation

| Check | Why |
|-------|-----|
| Negative values rejected where inappropriate | Credit instead of debit |
| Integer overflow considered | Wrap-around to small/negative |
| Decimal/integer for money, not float | Precision loss |
| Quantity limits enforced | Extreme values |

**Patterns to catch:**
- Quantity or amount accepted without sign check
- Price or total calculated with floating point
- No upper bound on numeric inputs
- Multiplication without overflow check

---

## State Machine Violations

| Check | Why |
|-------|-----|
| Valid transitions enforced server-side | Skipping required steps |
| Cannot skip required steps | Payment bypass |
| Cannot revisit states inappropriately | Double-claiming benefits |
| State changes logged | Audit trail |

**Patterns to catch:**
- Direct status update endpoint without transition validation
- Order completed without payment state
- Coupon/benefit re-applied after state regression
- No state transition history

---

## Discount & Coupon Abuse

| Check | Why |
|-------|-----|
| Single-use or properly limited | Reuse attack |
| Stacking rules enforced server-side | Over-discount |
| Referral loops prevented | Self-referral abuse |
| Discount calculated server-side | Client-controlled discount |

**Patterns to catch:**
- No check for coupon already used
- Multiple coupons applicable without limit
- Same user as referrer and referee
- Discount percentage from client input

---

## Time-Based Attacks

| Check | Why |
|-------|-----|
| Server time for all time-sensitive logic | Client clock manipulation |
| Timezone handling consistent | Off-by-hours errors |
| Expiration checked server-side | Token/coupon validity bypass |

**Patterns to catch:**
- Timestamp from client used for validation
- Expiration check using client-provided time
- Time-limited offers validated client-side

---

## Account & Limit Abuse

| Check | Why |
|-------|-----|
| Multi-account detection | Bonus farming |
| Resource limits per user | Free tier abuse |
| Velocity checks on sensitive operations | Automated abuse |

**Patterns to catch:**
- Signup bonus without identity verification
- No rate limit on account creation
- Free tier limits checked only at action time, not resource creation
- No detection for same device/IP creating multiple accounts

---

## Privilege Boundaries

| Check | Why |
|-------|-----|
| Feature flags verified server-side | Client flag manipulation |
| Trial/premium boundaries enforced backend | Feature theft |
| Admin actions logged and alerted | Abuse detection |
| Impersonation properly restricted and logged | Privilege abuse |

**Patterns to catch:**
- Feature availability in JWT without server verification
- Premium features with client-only check
- Admin impersonation without audit log
- Support actions without scope limits
