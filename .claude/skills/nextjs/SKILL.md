---
name: nextjs
description: Next.js 15+ App Router patterns including Server/Client Components, Streaming, Server Actions, routing, caching, and domain-driven structure. Use when building Next.js applications with App Router.
---

# Next.js App Router Patterns

## 1. Server & Client Components

### Server Components (Default)

```tsx
// app/products/page.tsx - Server Component
async function ProductsPage() {
  const products = await db.product.findMany(); // Direct DB access
  return (
    <main>
      <h1>Products</h1>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </main>
  );
}
```

### Client Components ('use client')

```tsx
// components/AddToCartButton.tsx
'use client';

import { useState } from 'react';

export function AddToCartButton({ productId }: { productId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  
  return (
    <button onClick={async () => {
      setIsAdding(true);
      await addToCart(productId);
      setIsAdding(false);
    }} disabled={isAdding}>
      {isAdding ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

**When to use 'use client'**: useState/useEffect, onClick/onChange, Browser APIs, custom hooks with state

### Mixing Components

```tsx
// Using Client Component in Server Component
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id); // Server
  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton productId={product.id} />
    </div>
  );
}
```

---

## 2. State Management

### Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│ What kind of state?                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Server State (API/DB data)                                 │
│  └→ Server Component: direct fetch (default)               │
│  └→ Client Component: TanStack Query                       │
│                                                             │
│  Client State                                               │
│  ├→ Component-local: useState                               │
│  ├→ Complex local: useReducer                               │
│  ├→ Global (theme, cart, UI): Zustand                       │
│  └→ Compound components: Context API                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Server Component = No State Library Needed

```tsx
// Server Component - fetch directly
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <div>{user.name}</div>;
}
```

### Client Component with TanStack Query

```tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Read
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
  });
}

// Write
function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => 
      fetch('/api/users', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
```

### Zustand for Client State

```tsx
// stores/cart.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
);

// Usage in Client Component
'use client';
function CartButton() {
  const items = useCartStore((s) => s.items);
  return <button>Cart ({items.length})</button>;
}
```

### When to Use What

| State Type | Solution | Example |
|------------|----------|---------|
| API data (Server Component) | Direct fetch | `await db.user.findMany()` |
| API data (Client Component) | TanStack Query | `useQuery`, `useMutation` |
| Form input | `useState` | `const [email, setEmail] = useState('')` |
| Complex form | `useReducer` | Multi-field validation |
| Theme, locale | Zustand + persist | `useThemeStore()` |
| Shopping cart | Zustand + persist | `useCartStore()` |
| Modal open/close | `useState` or Zustand | Depends on scope |
| Compound component | Context API | `<Tabs>` internal state |

---

## 3. Streaming & Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}

// app/dashboard/loading.tsx - Auto Suspense wrapper
export default function Loading() {
  return <DashboardSkeleton />;
}
```

### Partial Prerendering (PPR)

```tsx
// next.config.ts
export default {
  experimental: {
    ppr: true,
  },
};

// app/products/page.tsx
export default function ProductsPage() {
  return (
    <div>
      {/* Static - prerendered */}
      <h1>Products</h1>
      <StaticFilters />
      
      {/* Dynamic - streams in */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}
```

---

## 4. Data Fetching & Caching

```tsx
// SSG - Cached (default)
const data = await fetch(url);

// SSR - No cache
const data = await fetch(url, { cache: 'no-store' });

// ISR - Revalidate
const data = await fetch(url, { next: { revalidate: 60 } });

// Tag-based
const data = await fetch(url, { next: { tags: ['products'] } });
```

### Data Access Layer

```typescript
// lib/data/user.ts
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Request deduplication
export const getUser = cache(async (id: string) => {
  return await db.user.findUnique({ where: { id } });
});

// Cross-request caching
export const getCachedUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ['user-by-id'],
  { revalidate: 3600, tags: ['users'] }
);
```

### Route Config

```tsx
export const dynamic = 'force-static';   // SSG
export const dynamic = 'force-dynamic';  // SSR
export const revalidate = 3600;          // ISR
```

---

## 5. Server Actions

```typescript
// app/actions/user.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function updateUser(userId: string, prevState: any, formData: FormData) {
  const result = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }
  
  await db.user.update({ where: { id: userId }, data: result.data });
  revalidateTag(`user-${userId}`);
  return { success: true };
}
```

### Form with Server Action (Next.js 15)

```tsx
'use client';

import { useActionState } from 'react';

export function UserForm({ userId }: { userId: string }) {
  const [state, dispatch, isPending] = useActionState(
    updateUser.bind(null, userId),
    { error: null, success: false }
  );
  
  return (
    <form action={dispatch}>
      <input name="name" required />
      <input name="email" type="email" required />
      {state.error && <p className="text-red-500">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### useFormStatus (for nested components)

```tsx
'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
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

## 6. Routing Patterns

### Dynamic Routes (Next.js 15)

```tsx
// app/products/[id]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  return <ProductDetail product={product} />;
}

// searchParams is also a Promise
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = await search(q);
  return <SearchResults results={results} />;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}
```

### Route Groups

```
app/
├── (marketing)/          # Marketing layout
│   ├── layout.tsx
│   ├── page.tsx          # /
│   └── about/page.tsx    # /about
├── (shop)/               # Shop layout
│   ├── layout.tsx
│   └── products/page.tsx # /products
└── (dashboard)/          # Dashboard layout
    ├── layout.tsx
    └── dashboard/page.tsx
```

### Parallel Routes

```tsx
// app/dashboard/layout.tsx
export default function Layout({
  children,
  analytics,
  metrics,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  metrics: React.ReactNode;
}) {
  return (
    <div className="grid">
      {children}
      {analytics}
      {metrics}
    </div>
  );
}
```

### Intercepting Routes (Modals)

```
app/
├── @modal/(.)products/[id]/page.tsx  # Intercept as modal
├── products/[id]/page.tsx            # Full page
└── layout.tsx                        # {children} {modal}
```

---

## 7. Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## 8. Error Handling

```tsx
// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/products/[id]/not-found.tsx
export default function NotFound() {
  return <h2>Product Not Found</h2>;
}

// Trigger notFound
import { notFound } from 'next/navigation';
if (!product) notFound();
```

---

## 9. File Structure (Domain-First)

```
app/
├── (routes)/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   └── about/page.tsx
│   ├── (shop)/
│   │   ├── products/page.tsx
│   │   └── cart/page.tsx
│   └── (dashboard)/
│       └── dashboard/page.tsx
├── domains/
│   ├── user/
│   │   ├── components/
│   │   │   ├── UserProfile.tsx
│   │   │   └── UserEditForm.tsx
│   │   ├── actions/
│   │   │   ├── queries.ts
│   │   │   └── mutations.ts
│   │   └── hooks/
│   │       └── useUserPreferences.ts
│   ├── product/
│   └── cart/
├── components/ui/
├── stores/             # Zustand stores
├── lib/
│   ├── db.ts
│   └── auth.ts
└── layout.tsx
```

---

## 10. Image & Metadata

```tsx
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={200}
  priority={false}
  sizes="(max-width: 768px) 100vw, 300px"
/>
```

```tsx
// app/products/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}
```

---

## Best Practices

1. **Server Components by default** - 'use client' only when needed
2. **Direct fetch in Server Components** - No TanStack Query needed
3. **TanStack Query in Client Components** - For client-side data needs
4. **Zustand for client state** - Theme, cart, UI preferences
5. **Server Actions for mutations** - All writes through Server Actions
6. **useActionState for forms** - Handles pending state automatically
7. **Await params/searchParams** - They're Promises in Next.js 15
8. **Streaming with Suspense** - Wrap slow components
9. **Domain-first structure** - Colocate by feature
