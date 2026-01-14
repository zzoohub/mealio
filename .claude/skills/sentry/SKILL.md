---
name: sentry
description: |
  Error tracking and monitoring with Sentry.
  Use when: setting up error tracking, error boundaries, alerting.
  Do not use for: general error handling patterns without Sentry.
  Workflow: Set up after core features are built.
---

# Sentry Error Tracking

**For latest Sentry APIs, use context7 MCP server with library-id `websites/sentry_io`.**

**Setup**: Use `npx @sentry/wizard@latest -i nextjs` or `npx @sentry/wizard@latest -i reactNative`

---

## Error Handling Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: UI Recovery                       │
│  → error.tsx (Next.js) / ErrorBoundary      │
│  → User-facing fallback + reset             │
└─────────────────────────────────────────────┘
                      +
┌─────────────────────────────────────────────┐
│  Layer 2: Error Capture                     │
│  → Sentry.captureException                  │
│  → Stack traces, context, alerting          │
└─────────────────────────────────────────────┘
```

**Rule: Always have both layers. UI recovery for users, Sentry for developers.**

---

## When to Use What

| Scenario | Solution |
|----------|----------|
| Route-level error recovery | `error.tsx` (Next.js) |
| Root app crash | `global-error.tsx` (Next.js) |
| Isolate component failures | `Sentry.ErrorBoundary` |
| Manual error capture | `Sentry.captureException` |

---

## Pattern: error.tsx + Sentry

```tsx
// app/dashboard/error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: 'dashboard' },
    });
  }, [error]);

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Pattern: Component Isolation

```tsx
// Isolate failures - one widget crash doesn't break the page
<Sentry.ErrorBoundary fallback={<ChartError />}>
  <AnalyticsChart />
</Sentry.ErrorBoundary>

<Sentry.ErrorBoundary fallback={<TableError />}>
  <DataTable />
</Sentry.ErrorBoundary>
```

**Rule: Wrap independent widgets in separate ErrorBoundaries.**

---

## Context and Tags

```typescript
// User context (after login)
Sentry.setUser({ id: user.id, email: user.email });

// Tags (filterable in dashboard)
Sentry.captureException(error, {
  tags: { component: 'PaymentForm', flow: 'checkout' },
  extra: { payload: requestData },
});
```

**Rule: Always set user context after auth. Add tags for filtering.**

---

## Sample Rates

| Type | Dev | Prod | Why |
|------|-----|------|-----|
| Errors (`sampleRate`) | 1.0 | 1.0 | Capture all errors |
| Traces (`tracesSampleRate`) | 1.0 | 0.1 | Performance cost |
| Replays (`replaysOnErrorSampleRate`) | 0 | 1.0 | Debug production issues |

---

## Quick Checklist

- [ ] SDK installed via wizard
- [ ] DSN and environment configured
- [ ] `error.tsx` at route levels (Next.js)
- [ ] `Sentry.ErrorBoundary` for widget isolation
- [ ] User context set after auth
- [ ] Tags added for filtering
- [ ] Source maps configured
- [ ] Alerts set up in Sentry dashboard
