---
name: performance-patterns
description: Frontend performance optimization patterns including code splitting, lazy loading, caching strategies, and Core Web Vitals optimization. Use when improving application performance, reducing bundle size, or optimizing loading times.
---

# Performance Patterns

Essential patterns for building fast, efficient web applications with optimal user experience.

## When to Use This Skill

- Optimizing Core Web Vitals (LCP, FID, CLS)
- Reducing JavaScript bundle size
- Improving initial page load time
- Implementing caching strategies
- Optimizing images and assets
- Debugging performance issues

## Core Concepts

### Core Web Vitals

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading performance |
| FID (First Input Delay) | < 100ms | Interactivity |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |

---

## 1. Code Splitting

Break your bundle into smaller chunks loaded on demand.

### Route-Based Splitting

```jsx
// React Router with lazy loading
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

```jsx
// Next.js dynamic imports
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});
```

### Library Splitting

```jsx
// ❌ Imports entire lodash (70KB+)
import _ from 'lodash';

// ✅ Import only what you need
import debounce from 'lodash/debounce';

// Dynamic library import
async function generatePDF(data) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  return doc;
}
```

---

## 2. Lazy Loading

Defer loading of non-critical resources.

### Image Lazy Loading

```jsx
// Native lazy loading
<img
  src={img.src}
  alt={img.alt}
  loading="lazy"
  decoding="async"
  width={400}
  height={300}
/>

// Next.js Image
import Image from 'next/image';

<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurHash}
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

### Intersection Observer

```jsx
function useLazyLoad(ref, rootMargin = '100px') {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  
  return isVisible;
}
```

---

## 3. Prefetching & Preloading

```jsx
// Next.js Link prefetching
import Link from 'next/link';

<Link href="/products">Products</Link> // Auto-prefetch
<Link href="/terms" prefetch={false}>Terms</Link> // Disable

// Manual prefetch on hover
const router = useRouter();
const handleMouseEnter = () => {
  router.prefetch(`/products/${productId}`);
};
```

```html
<!-- Resource hints -->
<link rel="preconnect" href="https://api.example.com" />
<link rel="dns-prefetch" href="https://analytics.example.com" />
<link rel="preload" href="/fonts/Inter.woff2" as="font" crossorigin />
```

---

## 4. Caching Strategies

### React Query / TanStack Query

```jsx
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}

// Prefetch on hover
const queryClient = useQueryClient();
queryClient.prefetchQuery({
  queryKey: ['product', productId],
  queryFn: () => fetchProduct(productId),
});
```

### Service Worker

```javascript
// Workbox strategies
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Images - cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' })
);

// API - network first
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' })
);
```

---

## 5. Bundle Optimization

### Tree Shaking

```javascript
// ✅ Named exports enable tree shaking
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;

// package.json
{ "sideEffects": false }
```

### Bundle Analysis

```bash
# Next.js
ANALYZE=true npm run build
```

### Lighter Alternatives

| Heavy | Light Alternative |
|-------|-------------------|
| moment.js (300KB) | date-fns (~5KB/fn), dayjs (2KB) |
| lodash (70KB) | Individual imports, native methods |
| axios (13KB) | fetch API (native) |

---

## 6. Image Optimization

```jsx
// Responsive images
<img
  src={`${src}-800.jpg`}
  srcSet={`
    ${src}-400.jpg 400w,
    ${src}-800.jpg 800w,
    ${src}-1200.jpg 1200w
  `}
  sizes="(max-width: 800px) 100vw, 800px"
  alt={alt}
  loading="lazy"
/>

// Modern formats with fallback
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

---

## 7. Rendering Optimization

### Memoization

```jsx
import { memo, useMemo, useCallback } from 'react';

// Memoize components
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return items.map(item => <Item key={item.id} {...item} />);
});

// Memoize computations
const filteredData = useMemo(() => 
  data.filter(item => item.active),
  [data]
);

// Stable callbacks
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
```

### Virtualization

```jsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}
```

---

## 8. Layout Stability (CLS)

```jsx
// Reserve space for images
<div style={{ aspectRatio: '16/9' }}>
  <Image src={src} alt={alt} fill />
</div>

// Reserve space for dynamic content
<div style={{ minHeight: '250px' }}>
  <Suspense fallback={<Skeleton height={250} />}>
    <DynamicContent />
  </Suspense>
</div>
```

```css
/* Font loading without CLS */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
}
```

---

## Performance Checklist

### Initial Load
- [ ] Code splitting by route
- [ ] Lazy load below-fold content
- [ ] Preload critical resources
- [ ] Use modern image formats (WebP/AVIF)

### Runtime
- [ ] Memoize expensive computations
- [ ] Virtualize long lists
- [ ] Debounce/throttle event handlers

### Caching
- [ ] Service worker for static assets
- [ ] Client-side data caching
- [ ] Appropriate cache headers

### Bundle Size
- [ ] Analyze bundle composition
- [ ] Remove unused dependencies
- [ ] Enable tree shaking

### Layout Stability
- [ ] Set image dimensions
- [ ] Reserve space for dynamic content
- [ ] Use font-display: swap

---

## Measuring Performance

```javascript
// Web Vitals
import { onCLS, onFID, onLCP, onINP } from 'web-vitals';

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
onINP(console.log);
```

```jsx
// Next.js reporting
export function reportWebVitals(metric) {
  analytics.track('Web Vital', {
    metric: metric.name,
    value: Math.round(metric.value),
  });
}
```

## Related Skills

- For React component patterns, see: `react-patterns`
- For rendering strategies, see: `rendering-patterns`
