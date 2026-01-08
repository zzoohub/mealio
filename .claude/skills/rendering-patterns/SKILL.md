---
name: rendering-patterns
description: Web rendering strategies (CSR, SSR, SSG, ISR, Streaming, RSC) for Next.js/Remix. Use when choosing rendering architecture, optimizing SEO/performance, or configuring data fetching strategies.
---

# Rendering Patterns

## Quick Reference

| Pattern | Data | Best For | SEO |
|---------|------|----------|-----|
| CSR | Client fetch | Dashboards, SPAs | ❌ |
| SSR | Per request | Personalized, real-time | ✅ |
| SSG | Build time | Blogs, docs, marketing | ✅ |
| ISR | Revalidate | E-commerce, news | ✅ |
| Streaming | Progressive | Slow APIs, dashboards | ✅ |

## Decision Tree

```
Real-time/personalized? → SSR or Streaming
Content changes often? → ISR
Static content? → SSG
Behind auth + interactive? → CSR
```

---

## 1. CSR (Client-Side Rendering)

Browser renders everything. Poor SEO, good for authenticated apps.

```jsx
const App = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  return data ? <Dashboard data={data} /> : <Spinner />;
};
```

**Use for**: Admin panels, internal tools, SPAs behind login.

---

## 2. SSR (Server-Side Rendering)

Server renders per request. Fresh data, good SEO.

```tsx
// Next.js App Router - cache: 'no-store' = SSR
async function ProductPage({ params }) {
  const product = await fetch(`/api/products/${params.id}`, {
    cache: 'no-store'
  }).then(r => r.json());
  
  return <div><h1>{product.name}</h1></div>;
}
```

```tsx
// Next.js Pages Router
export async function getServerSideProps({ params }) {
  const product = await getProduct(params.id);
  return { props: { product } };
}
```

```tsx
// Remix
export async function loader({ params }) {
  return json({ product: await getProduct(params.id) });
}
```

**Use for**: User-specific content, real-time data, frequently changing pages.

---

## 3. SSG (Static Site Generation)

Pre-rendered at build. Fastest, served from CDN.

```tsx
// Next.js App Router - static by default
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <article><h1>{post.title}</h1></article>;
}
```

```tsx
// Next.js Pages Router
export async function getStaticPaths() {
  const posts = await getAllPosts();
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  return { props: { post: await getPost(params.slug) } };
}
```

**Use for**: Blogs, docs, marketing pages, content that rarely changes.

---

## 4. ISR (Incremental Static Regeneration)

Static + background revalidation. Best of SSG and SSR.

```tsx
// Next.js App Router - time-based
const products = await fetch('/api/products', {
  next: { revalidate: 60 } // Refresh every 60s
}).then(r => r.json());

// Tag-based revalidation
const data = await fetch('/api/data', {
  next: { tags: ['products'] }
});

// On-demand revalidation API
import { revalidateTag } from 'next/cache';
export async function POST(req) {
  revalidateTag('products');
  return Response.json({ revalidated: true });
}
```

```tsx
// Next.js Pages Router
export async function getStaticProps() {
  return {
    props: { products: await getProducts() },
    revalidate: 60
  };
}
```

**Fallback options**: `false` (404), `true` (loading state), `'blocking'` (wait).

**Use for**: E-commerce, news, large sites with periodic updates.

---

## 5. Streaming SSR

Progressive HTML chunks. Fast initial paint.

```tsx
// Next.js - Suspense boundaries
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <Header /> {/* Immediate */}
      <Suspense fallback={<ChartSkeleton />}>
        <SlowAnalytics /> {/* Streams when ready */}
      </Suspense>
    </div>
  );
}

// loading.tsx for route-level loading
export default function Loading() {
  return <DashboardSkeleton />;
}
```

```tsx
// Remix - defer
export async function loader() {
  return defer({
    analytics: fetchAnalytics(), // Don't await
  });
}

export default function Page() {
  const { analytics } = useLoaderData();
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={analytics}>
        {data => <Chart data={data} />}
      </Await>
    </Suspense>
  );
}
```

**Use for**: Dashboards, pages with slow APIs, multiple data sources.

---

## 6. React Server Components (RSC)

Server-only components. Zero client JS, direct DB access.

```tsx
// Server Component (default) - no 'use client'
async function Products() {
  const products = await db.product.findMany(); // Direct DB
  return products.map(p => <Card key={p.id} product={p} />);
}

// Client Component - interactive
'use client';
export function AddToCart({ id }) {
  const [adding, setAdding] = useState(false);
  return <button onClick={() => addToCart(id)}>Add</button>;
}

// Mix them
async function ProductPage({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  return (
    <div>
      <h1>{product.name}</h1> {/* Server */}
      <AddToCart id={product.id} /> {/* Client */}
    </div>
  );
}
```

| | Server Component | Client Component |
|-|-----------------|------------------|
| Hooks/events | ❌ | ✅ |
| DB/filesystem | ✅ | ❌ |
| Bundle size | Zero | Adds JS |
| Secrets safe | ✅ | ❌ |

---

## Next.js Route Config

```tsx
// Force SSR
export const dynamic = 'force-dynamic';

// Force static
export const dynamic = 'force-static';

// ISR
export const revalidate = 60;

// No cache
export const fetchCache = 'force-no-store';
```

---

## Performance Impact

| Pattern | FCP | LCP | TTFB |
|---------|-----|-----|------|
| CSR | Poor | Poor | Best |
| SSR | Good | Good | Medium |
| SSG/ISR | Best | Best | Best |
| Streaming | Best | Good | Best |
