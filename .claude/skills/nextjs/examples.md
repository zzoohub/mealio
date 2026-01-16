# Next.js Examples

Code examples for common patterns with Vercel React Best Practices applied.

---

## Server Actions

### Basic Form with Validation

```typescript
// features/contact/actions/sendMessage.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type State = {
  error?: string;
  success?: boolean;
};

export async function sendMessage(prevState: State, formData: FormData): Promise<State> {
  const result = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  try {
    await db.message.create({ data: result.data });
    revalidatePath('/messages');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to send message' };
  }
}
```

```tsx
// features/contact/ui/ContactForm.tsx
'use client';

import { useActionState } from 'react';
import { sendMessage } from '../actions/sendMessage';

export function ContactForm() {
  const [state, dispatch, isPending] = useActionState(sendMessage, {});

  if (state.success) {
    return <p>Message sent successfully!</p>;
  }

  return (
    <form action={dispatch} className="space-y-4">
      {/* Disable all inputs during submission */}
      <fieldset disabled={isPending}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        
        <div>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required />
        </div>

        {state.error && (
          <p className="text-red-500">{state.error}</p>
        )}

        <button type="submit">
          {isPending ? 'Sending...' : 'Send Message'}
        </button>
      </fieldset>
    </form>
  );
}
```

### Optimistic Updates

```tsx
'use client';

import { useOptimistic } from 'react';
import { toggleLike } from '../actions/toggleLike';

export function LikeButton({ post }: { post: Post }) {
  const [optimisticLikes, addOptimistic] = useOptimistic(
    post.likes,
    (state, increment: number) => state + increment
  );

  return (
    <form
      action={async () => {
        addOptimistic(1);
        await toggleLike(post.id);
      }}
    >
      <button type="submit">❤️ {optimisticLikes}</button>
    </form>
  );
}
```

### Delete with Confirmation

```typescript
// features/post/actions/deletePost.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath('/posts');
  redirect('/posts');
}
```

```tsx
'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { deletePost } from '../actions/deletePost';

export function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Are you sure?')) return;
    
    startTransition(async () => {
      try {
        await deletePost(postId);
      } catch (e) {
        toast.error('Failed to delete post');
      }
    });
  };

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

---

## Data Fetching

### Parallel Data Fetching

```tsx
// app/dashboard/page.tsx
async function DashboardPage() {
  // Parallel fetching - all start immediately
  const [stats, recentOrders, topProducts] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getTopProducts(),
  ]);

  return (
    <div>
      <StatsCards stats={stats} />
      <RecentOrders orders={recentOrders} />
      <TopProducts products={topProducts} />
    </div>
  );
}
```

### Streaming with Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Fast data - renders quickly */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
      
      {/* Slow data - streams in later */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      
      {/* Independent section */}
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrdersTable />
      </Suspense>
    </div>
  );
}

// Each section is a separate Server Component
async function StatsSection() {
  const stats = await getStats();
  return <StatsCards stats={stats} />;
}

async function RevenueChart() {
  const data = await getRevenueData(); // Slow query
  return <Chart data={data} />;
}
```

### Data with Caching

```typescript
// entities/user/api/getUser.ts
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Request-level deduplication (within same render)
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Cross-request cache with revalidation
export const getCachedUser = unstable_cache(
  async (id: string) => {
    return db.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  },
  ['user-by-id'],
  {
    revalidate: 3600, // 1 hour
    tags: ['users'],
  }
);

// Revalidate when user updates
export async function updateUser(id: string, data: UpdateUserData) {
  await db.user.update({ where: { id }, data });
  revalidateTag('users');
}
```

---

## Auth Patterns

### Middleware Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Server Component Auth Check

```tsx
// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

### Client-Side Auth Hook

```tsx
// shared/lib/useAuth.ts
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRequireAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return { session, isLoading: status === 'loading' };
}
```

---

## TanStack Query (Client Components)

```tsx
// features/products/hooks/useProducts.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts(filters: Filters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Usage in component
function ProductsPage() {
  const { data: products, isLoading } = useProducts(filters);
  const { mutate: create, isPending } = useCreateProduct();
  
  // ...
}
```

---

## Zustand (Client State)

```typescript
// shared/store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ 
        items: [...state.items, item] 
      })),
      removeItem: (id) => set((state) => ({ 
        items: state.items.filter((i) => i.id !== id) 
      })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
);

// Derived state selectors - subscribe only to computed values
// Components using these will only re-render when the derived value changes
export const useCartTotal = () => 
  useCartStore((state) => 
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

export const useCartCount = () => 
  useCartStore((state) => 
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

export const useCartEmpty = () => 
  useCartStore((state) => state.items.length === 0);
```

```tsx
// Usage example - each component subscribes only to what it needs
'use client';

import { useCartStore, useCartTotal, useCartCount } from '@/shared/store/cartStore';

// Only re-renders when total changes
function CartTotal() {
  const total = useCartTotal();
  return <span>${total.toFixed(2)}</span>;
}

// Only re-renders when count changes
function CartBadge() {
  const count = useCartCount();
  if (count === 0) return null;
  return <span className="badge">{count}</span>;
}

// Only re-renders when items array changes
function CartItems() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name} - ${item.price}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```
