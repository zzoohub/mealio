---
name: nextjs
description: |
  Next.js 15+ App Router patterns and conventions.
  Use when: building web apps with Next.js.
  Do not use for: UX decisions (use ux-design), token/component design (use design-system), mobile apps.
  Workflow: ux-design → design-system → this skill (web integration).
references:
  - examples.md    # Server Actions, Data Fetching, Auth patterns code
---

# Next.js App Router Patterns

**For latest Next.js APIs, use context7 MCP server with library-id `vercel/next.js`.**

**Package manager**: Use `bun` for all commands.

---

## Project Structure (Feature-Sliced Design)

**Use Context7 MCP server with `websites/feature-sliced_github_io`**

```
app/                 # Next.js App Router (file-based routing)
├── layout.tsx       # Root layout
├── page.tsx         # Home (/)
└── some-page/
    └── page.tsx     # /some-page
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
    ├── ui/          # Design system components
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
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>  {/* Renders immediately */}
      
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />  {/* Streams when ready */}
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Streams when ready */}
      </Suspense>
    </div>
  );
}
```

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
| `cache()` from React | Request deduplication (same render) |
| `unstable_cache()` | Cross-request caching with revalidation |
| `revalidatePath()` | Invalidate specific path |
| `revalidateTag()` | Invalidate by tag |

**Rule: Always set revalidation strategy. Don't cache indefinitely.**

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

### Data
- [ ] Server data fetched in Server Components
- [ ] Slow data wrapped in Suspense
- [ ] Forms use Server Actions + useActionState
- [ ] Proper cache invalidation (revalidatePath/revalidateTag)

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
