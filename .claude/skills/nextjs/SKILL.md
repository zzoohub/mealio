---
name: nextjs
description: |
  Next.js 15+ App Router patterns and conventions.
  Use when: setup or building web apps with Next.js, setting up project structure, implementing features, creating pages/components, writing Server Actions, data fetching.
  Do not use for: UX decisions (use ux-design), token/component design (use design-system), mobile apps.
  Workflow: this skill (building web apps) -> vercel-react-best-practices (refactoring and performance optimization if needed).
references:
  - examples.md    # Server Actions, Data Fetching, Auth patterns code
---

# Next.js App Router Patterns

**For latest Next.js APIs, use context7.**

**Package manager**: Use `bun` for all commands.

---

## Project Structure (Feature-Sliced Design)

**For Feature-Sliced Design use Context7.**

```
app/                 # Next.js App Router (file-based routing)
├── layout.tsx       # Root layout
├── page.tsx         # Home (/)
└── some-page/
    └── page.tsx     # /some-page (routing + page composition)
src/
├── app/             # App-wide settings, providers, global styles
│   └── providers/
├── widgets/         # Large composite blocks (Header, Sidebar, Feed)
├── features/        # User interactions (auth, send-comment, add-to-cart)
│   └── auth/
│       ├── ui/
│       ├── model/
│       ├── api/
│       └── actions/   # Server Actions
├── entities/        # Business entities (user, product, order)
│   └── user/
│       ├── ui/
│       ├── model/
│       └── api/
└── shared/          # Reusable infrastructure
    ├── ui/          # Design system
    ├── lib/         # Utilities, helpers
    ├── api/         # API client
    └── config/      # Environment, constants
```

### FSD Layer Rules

| Layer | Can import from | Cannot import from |
|-------|-----------------|-------------------|
| `app` | All layers below | - |
| `widgets` | features, entities, shared | app |
| `features` | entities, shared | app, widgets |
| `entities` | shared | app, widgets, features |
| `shared` | - | All layers above |

**Rule: Layers can only import from layers below. Never above.**

---

## Server vs Client Components

```
Need useState, useEffect, onClick? → 'use client'
Need browser APIs (window, localStorage)? → 'use client'
Everything else → Server Component (default)
```

**Rule: Server Components by default. Add 'use client' only when needed.**

### Composition Pattern

```tsx
// Server Component fetches, Client Component interacts
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);  // Server-side fetch
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />  {/* Client leaf */}
    </div>
  );
}
```

---

## Streaming with Suspense

**Rule: Don't block on slow data. Stream progressively.**

```tsx
// Parent is NOT async — children fetch independently and stream in parallel
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>  {/* Renders immediately */}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />  {/* async SC — streams when ready */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* async SC — streams when ready */}
      </Suspense>
    </div>
  );
}
```

**Share a single fetch across components with `use()`:**

```tsx
function Page() {
  const dataPromise = fetchData(); // start immediately, don't await
  return (
    <Suspense fallback={<Skeleton />}>
      <DataDisplay dataPromise={dataPromise} />
      <DataSummary dataPromise={dataPromise} /> {/* same fetch, no duplication */}
    </Suspense>
  );
}
function DataDisplay({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.content}</div>;
}
```

**Skip Suspense when:** SEO-critical above-fold content, layout-shift-sensitive areas, fast queries where overhead isn't worth it.

---

## State Management

| State Type | Solution |
|------------|----------|
| Server data in Server Component | Direct fetch (no library) |
| Server data in Client Component | TanStack Query |
| Form input | useState |
| Global client (theme, cart) | Zustand + persist |

---

## Headless Patterns

**Rule: Separate WHAT (logic) from HOW (presentation).**

```tsx
// ❌ Before: Logic mixed in component
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  // ... 300+ lines
};
```

```tsx
// ✅ After: Main component is composition only
const ProductsPage = () => {
  const { filters, setFilter, clear } = useProductFilters();
  const { products, isLoading } = useProducts(filters);

  return (
    <Page>
      <FilterBar filters={filters} onChange={setFilter} onClear={clear} />
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductGrid products={products} isLoading={isLoading} />
      </Suspense>
    </Page>
  );
};
```

**Rule: Main component does composition only. Logic goes in hooks.**

---

## Server Actions

**For latest Server Actions API, use `context7` MCP or see [Next.js Server Actions docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).**

**Rule: Server Actions go in `features/*/actions/` directory.**

Pattern:
1. `'use server'` directive at top
2. Zod schema for validation
3. Return `{ error }` or `{ success }` 
4. Call `revalidatePath` or `revalidateTag` after mutation

```tsx
// Client form uses useActionState
const [state, dispatch, isPending] = useActionState(serverAction, initialState);
```

See `examples.md` for full implementation.

---

## Data Caching

**For latest caching APIs, use `context7` MCP or see [Next.js Caching docs](https://nextjs.org/docs/app/building-your-application/caching).**

| Pattern | Use for |
|---------|---------|
| `React.cache()` | Per-request deduplication (multiple components, one DB query) |
| LRU cache (`lru-cache`) | Cross-request caching with TTL (preferred for stability) |
| `revalidatePath()` | Invalidate specific path |
| `revalidateTag()` | Invalidate by tag |
| `after()` | Non-blocking post-response work (logging, analytics, cache invalidation) |

**Rule: Always set revalidation strategy. Don't cache indefinitely.**

---

## Performance Rules

*Details and code examples: see `vercel-react-best-practices` skill.*

### Eliminating Waterfalls (CRITICAL)

- **Parallel fetching via composition**: Non-async parent + async child Server Components (NOT `Promise.all()` in one component)
- **Defer await**: Move `await` into branches where actually used; early return before expensive fetches
- **Start promises early**: `const p = fetch()` immediately, `await p` later when needed
- **`Promise.all()`**: For truly independent operations that must all complete before rendering

### Bundle Optimization (CRITICAL)

- **Avoid barrel imports**: Import directly (`lucide-react/dist/esm/icons/check`), or use `optimizePackageImports` in `next.config.js`
- **Dynamic imports**: `next/dynamic` with `{ ssr: false }` for heavy components (editors, charts)
- **Defer third-party**: Load analytics/error tracking via dynamic import after hydration
- **Preload on intent**: `void import('./heavy')` on `onMouseEnter`/`onFocus`

### RSC Performance (HIGH)

- **Minimize serialization**: Only pass fields the client component uses, not entire objects
- **`React.cache()`**: Wrap DB queries for per-request dedup across components
- **`after()`**: Schedule logging/analytics/cache invalidation after response is sent

### Client Performance

- **Functional setState**: `setState(prev => ...)` to avoid stale closures and enable stable callbacks
- **Lazy state init**: `useState(() => expensive())` not `useState(expensive())`
- **Derived selectors**: Subscribe to booleans (`useMediaQuery`) not raw values (`useWindowWidth`)
- **Narrow deps**: `[user.id]` not `[user]` in effect dependency arrays
- **`startTransition`**: Wrap non-urgent updates (scroll tracking, search filtering)
- **Ternary over `&&`**: `{count > 0 ? <Badge /> : null}` to avoid rendering `0`
- **Hydration no-flicker**: Inline `<script>` for client-only data (theme, prefs) before React hydrates

---

## Quick Checklist

### Architecture
- [ ] Using FSD layer rules (no upward imports)
- [ ] Main component is composition only
- [ ] Logic extracted to custom hooks
- [ ] Server Actions in features/*/actions/

### Server/Client
- [ ] Server Components by default
- [ ] 'use client' only when needed (useState, onClick, browser APIs)
- [ ] Client components are leaf nodes
- [ ] Only needed fields passed across RSC→Client boundary

### Data
- [ ] Server data fetched in Server Components
- [ ] Slow data wrapped in Suspense (async child SCs, non-async parent)
- [ ] Forms use Server Actions + useActionState
- [ ] Proper cache invalidation (revalidatePath/revalidateTag)
- [ ] `React.cache()` for repeated queries within a request

### Bundle
- [ ] No barrel file imports (or `optimizePackageImports` configured)
- [ ] Heavy components use `next/dynamic`
- [ ] Analytics/logging deferred after hydration

### Design System
- [ ] Using tokens from design-system (no hardcoded values)
- [ ] Proper loading/error states

## Security Configuration

| Header | Value |
|--------|-------|
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `SAMEORIGIN` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |

| Item | Value |
|------|-------|
| Cookies httpOnly | `true` |
| Cookies secure | `true` |
| Cookies sameSite | `strict` |
