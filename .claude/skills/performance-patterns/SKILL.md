---
name: performance-patterns
description: |
  Web performance patterns and Core Web Vitals optimization.
  Use when: optimizing load times, fixing CWV issues, code splitting.
  Do not use for: SEO (use seo skill), general React patterns (use nextjs skill).
  Workflow: Use after core features are built.
---

# Performance Patterns

**For latest framework APIs, use `context7` MCP server with relevant library ID (e.g., `vercel/next.js`, `TanStack/query`).**

---

## Core Web Vitals Targets

| Metric | Target | Measures |
|--------|--------|----------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |

---

## Quick Wins

### 1. Lighter Alternatives

| Heavy | Light | Savings |
|-------|-------|---------|
| moment.js | date-fns, dayjs | ~300KB → ~2KB |
| lodash (full) | lodash-es (tree-shake) | ~70KB → ~5KB |
| axios | fetch (native) | ~13KB → 0 |

**Rule: Import only what you need.**

```typescript
// ❌ Imports entire lodash
import _ from 'lodash';

// ✅ Import only what you need
import debounce from 'lodash/debounce';
```

### 2. Code Splitting

**Rule: Split large components that aren't needed on initial load.**

- Route-based: Automatic in Next.js App Router, Expo Router
- Component-based: Use dynamic imports for heavy components
- Library-based: Import heavy libraries only when needed

**For implementation, use `context7` MCP or see:**
- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [React.lazy](https://react.dev/reference/react/lazy)

### 3. Dynamic Import for Libraries

**Rule: Load heavy libraries only when user triggers the action.**

```typescript
async function exportToPDF() {
  const { jsPDF } = await import('jspdf');
  // use jsPDF...
}
```

---

## Layout Stability (CLS)

**Rule: Always reserve space for dynamic content.**

| Element | Solution |
|---------|----------|
| Images | Set width/height or aspect-ratio |
| Dynamic content | Set minHeight, use skeleton |
| Fonts | Use font-display: swap |
| Ads/embeds | Reserve container space |

---

## Data Fetching

**Rule: Cache aggressively, prefetch on intent.**

| Pattern | When |
|---------|------|
| staleTime | Data that doesn't change often |
| Prefetch on hover | Links user is likely to click |
| Background refetch | Keep data fresh without blocking |

---

## Expensive Operations

| Pattern | Use for |
|---------|---------|
| Debounce | Search inputs, resize handlers |
| Throttle | Scroll handlers, frequent events |
| Virtualization | Lists > 100 items |
| Web Workers | Heavy computations |

---

## Quick Checklist

### Loading (LCP)
- [ ] Critical CSS inlined
- [ ] Images optimized (WebP/AVIF, proper sizing)
- [ ] Fonts preloaded
- [ ] Heavy libraries dynamically imported

### Responsiveness (INP)
- [ ] Click handlers are fast
- [ ] Heavy work deferred
- [ ] Expensive operations debounced

### Stability (CLS)
- [ ] Images have width/height
- [ ] Dynamic content has reserved space
- [ ] Fonts use font-display: swap
- [ ] No layout-shifting ads/embeds

### Bundle
- [ ] No full lodash/moment imports
- [ ] Large components code-split
- [ ] Bundle analyzed for bloat
