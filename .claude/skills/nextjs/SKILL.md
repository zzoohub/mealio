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
async function ProductPage({ params }) {
  const product = await getProduct(params.id); // Server
  return (
    <div>
      <h1>{product.name}</h1>           {/* Server */}
      <AddToCartButton productId={product.id} />  {/* Client */}
    </div>
  );
}
```

---

## 2. Streaming with Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />  {/* Streams when ready */}
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

---

## 3. Data Fetching & Caching

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

## 4. Server Actions

```typescript
// app/actions/user.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function updateUser(userId: string, formData: FormData) {
  const result = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  
  if (!result.success) return { error: result.error.errors[0].message };
  
  await db.user.update({ where: { id: userId }, data: result.data });
  revalidateTag(`user-${userId}`);
  return { success: true };
}
```

### Form with Server Action

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';

export function UserForm({ userId }) {
  const [state, dispatch] = useFormState(updateUser.bind(null, userId), {});
  
  return (
    <form action={dispatch}>
      <input name="name" required />
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}
```

### Optimistic Updates

```tsx
'use client';
import { useOptimistic } from 'react';

export function LikeButton({ post }) {
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

## 5. Routing Patterns

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
export default function Layout({ children, analytics, metrics }) {
  return (
    <div className="grid">
      {children}
      {analytics}  {/* @analytics/page.tsx */}
      {metrics}    {/* @metrics/page.tsx */}
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

### Dynamic Routes

```tsx
// app/products/[id]/page.tsx
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  return <ProductDetail product={product} />;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}
```

---

## 6. Middleware

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

## 7. Error Handling

```tsx
// app/dashboard/error.tsx
'use client';

export default function Error({ error, reset }) {
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

## 8. File Structure (Domain-First)

```
app/
├── (routes)/                 # Route groups
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   └── about/page.tsx
│   ├── (shop)/
│   │   ├── products/page.tsx
│   │   └── cart/page.tsx
│   └── (dashboard)/
│       └── dashboard/page.tsx
├── domains/                  # Domain modules
│   ├── user/
│   │   ├── components/
│   │   │   ├── UserProfile.tsx      # Server Component
│   │   │   └── UserEditForm.tsx     # 'use client'
│   │   ├── actions/
│   │   │   ├── queries.ts           # getUser, getUsers
│   │   │   └── mutations.ts         # updateUser, deleteUser
│   │   └── hooks/
│   │       └── useUserPreferences.ts
│   ├── product/
│   │   ├── components/
│   │   ├── actions/
│   │   └── hooks/
│   └── cart/
│       ├── components/
│       ├── actions/
│       └── hooks/
├── components/               # Shared UI
│   └── ui/
├── lib/                      # Utilities
│   ├── db.ts
│   └── auth.ts
├── api/
│   └── webhooks/route.ts
└── layout.tsx
```

**Domain structure principles:**
- `domains/[feature]/components/` - Feature-specific components
- `domains/[feature]/actions/` - queries (read) + mutations (write)
- `domains/[feature]/hooks/` - Client hooks
- `components/ui/` - Shared components only (Button, Input, etc.)

---

## 9. Image & Metadata

```tsx
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={200}
  priority={false}  // true for LCP images
  sizes="(max-width: 768px) 100vw, 300px"
/>
```

```tsx
// app/products/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}
```

---

## Best Practices

1. **Server Components by default** - Use 'use client' only when needed
2. **Streaming with Suspense** - Wrap slow components in Suspense
3. **Server Actions for mutations** - All writes through Server Actions
4. **Domain-first structure** - Colocate code by feature
5. **Proper caching** - Use revalidate, tags, unstable_cache
6. **Error boundaries** - Place error.tsx at appropriate levels
