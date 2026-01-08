---
name: error-tracking
description: Error tracking with Sentry for Next.js, React, and React Native. Covers error boundaries, Next.js error.tsx integration, and alerting.
---

# Error Tracking with Sentry

## Platform Setup

### Next.js

```bash
npx @sentry/wizard@latest -i nextjs
```

### React Native (Expo)

```bash
npx expo install @sentry/react-native
```

```typescript
// App.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
});

export default Sentry.wrap(App);
```

---

## Next.js Error Handling Integration

### Understanding the Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Next.js error.tsx                 │
│  → Route-level error UI                     │
│  → User-facing fallback + reset             │
└─────────────────────────────────────────────┘
                      +
┌─────────────────────────────────────────────┐
│  Layer 2: Sentry                            │
│  → Error capture and reporting              │
│  → Stack traces, alerting                   │
└─────────────────────────────────────────────┘
```

### error.tsx = Route-Level UI

```tsx
// app/dashboard/error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { location: 'dashboard' },
    });
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### global-error.tsx = Root Level

```tsx
// app/global-error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h1>Something went wrong!</h1>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

### Sentry.ErrorBoundary = Component Level

```tsx
// Isolate component failures within a page
import * as Sentry from "@sentry/nextjs";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Sentry.ErrorBoundary fallback={<ChartError />}>
        <AnalyticsChart />
      </Sentry.ErrorBoundary>
      
      <Sentry.ErrorBoundary fallback={<TableError />}>
        <DataTable />
      </Sentry.ErrorBoundary>
    </div>
  );
}
```

### When to Use What

| Scenario | Solution |
|----------|----------|
| Route-level error recovery | `error.tsx` |
| Root app crash | `global-error.tsx` |
| Isolate component failures | `Sentry.ErrorBoundary` |
| Server Component errors | `error.tsx` catches them |

### Recommended Structure

```
app/
├── global-error.tsx          # Root-level errors
├── error.tsx                 # Default error UI
├── dashboard/
│   ├── page.tsx              # Uses Sentry.ErrorBoundary for widgets
│   └── error.tsx             # Dashboard-specific error UI
└── checkout/
    └── error.tsx             # Checkout-specific messaging
```

---

## Error Boundaries (React/React Native)

```tsx
import * as Sentry from "@sentry/react";

<Sentry.ErrorBoundary
  fallback={({ error, resetError }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetError}>Try again</button>
    </div>
  )}
>
  <CriticalComponent />
</Sentry.ErrorBoundary>
```

---

## Context and Tags

### User Context

```typescript
// After login
Sentry.setUser({ id: user.id, email: user.email });

// After logout
Sentry.setUser(null);
```

### Tags (Filterable)

```typescript
Sentry.setTag("app_version", "1.2.3");

Sentry.captureException(error, {
  tags: { component: "PaymentForm" },
  extra: { payload: requestData },
});
```

---

## Manual Capture

```typescript
// Exceptions
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Messages
Sentry.captureMessage("User completed onboarding", "info");
```

---

## Sample Rates by Environment

```typescript
Sentry.init({
  dsn: "...",
  environment: process.env.NODE_ENV,
  
  // Errors: always capture
  sampleRate: 1.0,
  
  // Performance: reduce in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Replays
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,
  
  // Ignore noise
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
  ],
});
```

---

## Checklist

- [ ] Install Sentry SDK (use wizard)
- [ ] Configure DSN and environment
- [ ] Add error.tsx at appropriate route levels
- [ ] Use Sentry.ErrorBoundary for component isolation
- [ ] Set user context after auth
- [ ] Add relevant tags for filtering
- [ ] Configure source maps
- [ ] Set up alerts in Sentry dashboard
