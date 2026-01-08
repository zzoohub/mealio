---
name: performance-patterns
description: Frontend performance optimization patterns for Web and React Native. Covers code splitting, lazy loading, caching strategies, Core Web Vitals, and mobile performance. Use when improving application performance or optimizing loading times.
---

# Performance Patterns

Essential patterns for building fast, efficient applications across Web and React Native.

## When to Use This Skill

- Optimizing Core Web Vitals (LCP, INP, CLS)
- Reducing JavaScript bundle size
- Improving initial page load time
- Implementing caching strategies
- Optimizing images and assets
- Improving React Native performance
- Debugging performance issues

---

## Web Performance

### Core Web Vitals

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading performance |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |

### Code Splitting

```tsx
// Route-based splitting (React Router)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Next.js dynamic imports
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### Library Splitting

```tsx
// ❌ Imports entire library
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

### Image Optimization

```tsx
// Next.js Image
import Image from 'next/image';

<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurHash}
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 800px"
/>

// Native lazy loading
<img
  src={img.src}
  alt={img.alt}
  loading="lazy"
  decoding="async"
  width={400}
  height={300}
/>
```

### Prefetching

```tsx
// Next.js Link prefetching
import Link from 'next/link';

<Link href="/products">Products</Link>  // Auto-prefetch
<Link href="/terms" prefetch={false}>Terms</Link>  // Disable

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

### Caching with TanStack Query

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  });
}

// Prefetch on hover
const queryClient = useQueryClient();
queryClient.prefetchQuery({
  queryKey: ['product', productId],
  queryFn: () => fetchProduct(productId),
});
```

### Layout Stability (CLS)

```tsx
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

## React Native Performance

### List Performance

```tsx
// ❌ FlatList for large lists
import { FlatList } from 'react-native';

// ✅ FlashList for better performance
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={80}
  keyExtractor={(item) => item.id}
/>
```

### FlashList Optimization

```tsx
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}
  // Optimize for specific use cases
  drawDistance={250}                    // Pre-render distance
  overrideItemLayout={(layout, item) => {
    layout.size = item.type === 'header' ? 50 : 80;
  }}
  getItemType={(item) => item.type}     // Different item types
/>
```

### Memoization

```tsx
import { memo, useCallback, useMemo } from 'react';

// Memoize components
const ProductCard = memo(function ProductCard({ 
  product, 
  onPress 
}: Props) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Text>{product.name}</Text>
    </Pressable>
  );
});

// Memoize callbacks
function ProductList({ products }: { products: Product[] }) {
  const handlePress = useCallback((id: string) => {
    router.push(`/product/${id}`);
  }, []);

  return products.map(p => (
    <ProductCard key={p.id} product={p} onPress={handlePress} />
  ));
}

// Memoize expensive computations
const sortedProducts = useMemo(() => 
  products.sort((a, b) => b.price - a.price),
  [products]
);
```

### Image Optimization (React Native)

```tsx
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: imageUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  resizeMode={FastImage.resizeMode.cover}
  style={styles.image}
/>

// Preload images
FastImage.preload([
  { uri: 'https://example.com/image1.jpg' },
  { uri: 'https://example.com/image2.jpg' },
]);
```

### Animation Performance

```tsx
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// ✅ Runs on UI thread (60fps)
const translateX = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
}));

// ✅ Always use useNativeDriver with Animated API
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // Required for performance
}).start();
```

### Avoid Re-renders

```tsx
// ❌ Inline objects cause re-renders
<View style={{ padding: 16, margin: 8 }}>

// ✅ Use StyleSheet
const styles = StyleSheet.create({
  container: { padding: 16, margin: 8 },
});
<View style={styles.container}>

// ❌ Inline functions cause re-renders
<Button onPress={() => handlePress(id)} />

// ✅ Memoized callback
const handlePressItem = useCallback((id) => {
  // handle press
}, []);
<Button onPress={() => handlePressItem(id)} />
```

### Heavy Computation

```tsx
import { InteractionManager } from 'react-native';

// Defer heavy work until after animations
useEffect(() => {
  InteractionManager.runAfterInteractions(() => {
    // Heavy computation here
    processLargeDataset();
  });
}, []);

// Or use requestAnimationFrame for chunked work
function processInChunks(items: Item[], chunkSize = 100) {
  let index = 0;
  
  function processChunk() {
    const chunk = items.slice(index, index + chunkSize);
    chunk.forEach(processItem);
    index += chunkSize;
    
    if (index < items.length) {
      requestAnimationFrame(processChunk);
    }
  }
  
  requestAnimationFrame(processChunk);
}
```

### Bundle Size (React Native)

```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Check what's included
npx react-native info
```

### Hermes Engine

```json
// app.json (Expo)
{
  "expo": {
    "jsEngine": "hermes"
  }
}

// android/gradle.properties
hermesEnabled=true
```

### Memory Management

```tsx
// Clean up subscriptions
useEffect(() => {
  const subscription = eventEmitter.subscribe(handler);
  return () => subscription.unsubscribe();
}, []);

// Clean up timers
useEffect(() => {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}, []);

// Avoid memory leaks with async operations
useEffect(() => {
  let isMounted = true;
  
  async function fetchData() {
    const data = await api.getData();
    if (isMounted) {
      setData(data);
    }
  }
  
  fetchData();
  return () => { isMounted = false; };
}, []);
```

### Profiling Tools

```tsx
// React DevTools Profiler
// - Identify slow components
// - Check re-render counts

// Flipper (React Native)
// - Network inspector
// - Layout inspector
// - Performance monitor

// systrace (Android)
npx react-native start --reset-cache
adb shell "setprop debug.hwui.profile visual_bars"
```

---

## Common Patterns (Both Platforms)

### Debounce & Throttle

```tsx
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

function SearchInput() {
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      performSearch(term);
    }, 300),
    []
  );

  return (
    <TextInput
      onChangeText={debouncedSearch}
      placeholder="Search..."
    />
  );
}
```

### Virtualization

```tsx
// Web: react-window
import { FixedSizeList } from 'react-window';

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

// React Native: FlashList (shown above)
```

### Lazy Initialization

```tsx
// Lazy useState
const [state, setState] = useState(() => {
  return expensiveComputation();  // Only runs once
});

// Lazy ref
const ref = useRef<ExpensiveObject | null>(null);
if (ref.current === null) {
  ref.current = new ExpensiveObject();
}
```

---

## Performance Checklist

### Web

- [ ] Code splitting by route
- [ ] Lazy load below-fold content
- [ ] Preload critical resources
- [ ] Use modern image formats (WebP/AVIF)
- [ ] Set image dimensions (prevent CLS)
- [ ] Analyze and reduce bundle size
- [ ] Enable caching (TanStack Query, Service Worker)
- [ ] Measure Core Web Vitals

### React Native

- [ ] Use FlashList for long lists
- [ ] Memoize components and callbacks
- [ ] Use Reanimated with UI thread animations
- [ ] Avoid inline styles and functions
- [ ] Use FastImage for image caching
- [ ] Enable Hermes engine
- [ ] Profile with Flipper
- [ ] Test on physical devices (not just simulator)
- [ ] Clean up subscriptions and timers

### Both

- [ ] Debounce/throttle expensive operations
- [ ] Virtualize long lists
- [ ] Lazy load heavy libraries
- [ ] Minimize re-renders
- [ ] Use appropriate caching strategies
