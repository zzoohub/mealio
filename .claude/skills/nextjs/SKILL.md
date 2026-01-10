---
name: nextjs
description: Next.js 15+ App Router patterns - Server/Client Components, Streaming, Server Actions, and project conventions. Use when building Next.js applications.
---

# Next.js App Router Patterns

## Project Structure

```
app/                 # Next.js App Router (file-based routing)
src/
├── providers/       # App infrastructure (QueryClient, Theme)
├── design-system/   # UI system (tokens, headless hooks, styled components)
├── domains/         # Feature modules (fractal structure)
│   └── user/        # Example domain
│       ├── actions/ # Server Actions
│       ├── components/
│       ├── hooks/
│       └── types/
├── components/      # Shared components (Header, Footer)
├── lib/             # Independent modules (db, auth, logger)
├── hooks/           # Shared custom hooks
├── store/           # Zustand store
└── types/           # Shared types
```

---

## Headless Patterns (Logic/View Separation)

### Core Principle

**Separate WHAT (logic) from HOW (presentation).**

```tsx
// 1. Logic Layer (Hook) - data and actions only
const useProductFilters = () => {
  const [filters, setFilters] = useState<Filters>({});
  
  return {
    filters,
    setFilter: (key: string, value: string) => 
      setFilters(prev => ({ ...prev, [key]: value })),
    clear: () => setFilters({}),
    activeCount: Object.keys(filters).length,
  };
};

// 2. View Layer - styles only, receives data via props
const FilterBar = ({ filters, onChange, onClear, activeCount }: FilterBarProps) => (
  <div className="flex gap-2">
    <FilterDropdown value={filters.category} onChange={v => onChange('category', v)} />
    {activeCount > 0 && <ClearButton onClick={onClear} />}
  </div>
);

// 3. Composition - assembly only 
const ProductsPage = () => {
  const { filters, setFilter, clear, activeCount } = useProductFilters();
  
  return (
    <Page>
      <FilterBar filters={filters} onChange={setFilter} onClear={clear} activeCount={activeCount} />
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList filters={filters} />
      </Suspense>
    </Page>
  );
};
```

### Server Component + Composition

```tsx
// Server Component with streaming
export default async function DashboardPage() {
  return (
    <Page>
      <PageHeader title="Dashboard" />
      
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </Page>
  );
}

// Each section is a focused Server Component
async function StatsSection() {
  const stats = await getStats();
  return <StatsGrid stats={stats} />;
}
```

---

## Server & Client Components

### When to Use 'use client'

```
Need useState, useEffect, onClick? → 'use client'
Need browser APIs (window, localStorage)? → 'use client'
Everything else → Server Component (default)
```

### Composition Pattern

```tsx
// Server Component fetches data, composes Client Components as leaves
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />  {/* Client leaf */}
    </div>
  );
}
```

```tsx
// Client Component - interactive leaf
'use client';

export function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, setIsPending] = useState(false);
  
  return (
    <button onClick={() => { /* ... */ }} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

---

## Streaming & Suspense

**Don't block on slow data. Stream progressively.**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>  {/* Renders immediately */}
      
      <Suspense fallback={<CardsSkeleton />}>
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

### Decision Tree

```
Server data in Server Component → Direct fetch (no library)
Server data in Client Component → TanStack Query
Form input → useState
Global client (theme, cart) → Zustand + persist
```

### TanStack Query (Client Component)

```tsx
'use client';

function useProducts(filters: Filters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  });
}

function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
```

### Zustand (Client State)

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    { name: 'cart-storage' }
  )
);
```

---

## Server Actions

### Action + Form Pattern

```typescript
// app/actions/post.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
});

export async function createPost(prevState: any, formData: FormData) {
  const result = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });
  
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }
  
  await db.post.create({ data: result.data });
  revalidatePath('/posts');
  return { success: true };
}
```

```tsx
// Form with useActionState
'use client';

import { useActionState } from 'react';

export function PostForm() {
  const [state, dispatch, isPending] = useActionState(createPost, { error: null });
  
  return (
    <form action={dispatch}>
      <input name="title" required />
      <textarea name="content" required />
      {state.error && <p className="text-red-500">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```tsx
'use client';

import { useOptimistic } from 'react';

export function LikeButton({ post }: { post: Post }) {
  const [optimisticLikes, addOptimistic] = useOptimistic(
    post.likes,
    (state, increment: number) => state + increment
  );

  return (
    <button onClick={async () => {
      addOptimistic(1);
      await toggleLike(post.id);
    }}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

---

## Data Access Layer

```typescript
// lib/data/user.ts
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Request deduplication (same request, same render)
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Cross-request caching (persists across requests)
export const getCachedUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ['user-by-id'],
  { revalidate: 3600, tags: ['users'] }
);
```

---

## Best Practices

1. **Server Components by default** - 'use client' only for interactivity
2. **Stream with Suspense** - Don't block on slow data
3. **Server Actions for mutations** - No API routes for forms
4. **useActionState for forms** - Handles pending state automatically
5. **Interface-first** - Define hook signatures before implementation
6. **Colocate by feature** - Domain-first structure
