# React Native (Expo) Examples

Implementation examples for common patterns.

---

## Auth Guard Pattern

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(app)/(tabs)/home');
  }, [user, segments, isLoading]);

  return isLoading ? <SplashScreen /> : <Slot />;
}
```

---

## State Persistence (Zustand + MMKV)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// MMKV storage adapter
const storage = new MMKV();
const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

// Persisted store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { 
      name: 'user-storage', 
      storage: createJSONStorage(() => mmkvStorage) 
    }
  )
);
```

### Multiple Stores Pattern

```typescript
// stores/index.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    { name: 'auth-storage', storage: createJSONStorage(() => mmkvStorage) }
  )
);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      notifications: true,
      setTheme: (theme) => set({ theme }),
      toggleNotifications: () => set((s) => ({ notifications: !s.notifications })),
    }),
    { name: 'settings-storage', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

---

## Forms (TanStack Form + Zod)

### Basic Form

```tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

function LoginForm() {
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validatorAdapter: zodValidator(),
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      await login(value);
    },
  });

  return (
    <View style={styles.form}>
      <form.Field
        name="email"
        children={(field) => (
          <FormField label="Email" error={field.state.meta.errors[0]}>
            <Input
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </FormField>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <FormField label="Password" error={field.state.meta.errors[0]}>
            <Input
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              secureTextEntry
            />
          </FormField>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button 
            onPress={form.handleSubmit} 
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
      />
    </View>
  );
}
```

### Form with Array Fields

```tsx
const form = useForm({
  defaultValues: {
    name: '',
    emails: [{ value: '' }],
  },
});

// Add field
const addEmail = () => {
  form.pushFieldValue('emails', { value: '' });
};

// Remove field
const removeEmail = (index: number) => {
  form.removeFieldValue('emails', index);
};

// Render array fields
<form.Field name="emails" mode="array">
  {(field) => (
    <>
      {field.state.value.map((_, index) => (
        <form.Field key={index} name={`emails[${index}].value`}>
          {(subField) => (
            <Input
              value={subField.state.value}
              onChangeText={subField.handleChange}
            />
          )}
        </form.Field>
      ))}
      <Button onPress={addEmail}>Add Email</Button>
    </>
  )}
</form.Field>
```

---

## Animations (Reanimated + Gesture Handler)

### Swipeable Card

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

function SwipeableCard({ children, onSwipeLeft, onSwipeRight }: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 120;

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(500, {}, () => {
          if (onSwipeRight) runOnJS(onSwipeRight)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-500, {}, () => {
          if (onSwipeLeft) runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

### Fade In on Mount

```tsx
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

function AnimatedCard({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(200)}
    >
      {children}
    </Animated.View>
  );
}

// List item with staggered animation
function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Animated.View 
      entering={SlideInRight.delay(index * 50).springify()}
      exiting={SlideOutLeft}
    >
      {children}
    </Animated.View>
  );
}
```

### Shared Element Transition

```tsx
import Animated, { SharedTransition } from 'react-native-reanimated';

// In list screen
<Animated.Image 
  source={{ uri: item.image }}
  sharedTransitionTag={`image-${item.id}`}
  style={styles.thumbnail}
/>

// In detail screen
<Animated.Image
  source={{ uri: item.image }}
  sharedTransitionTag={`image-${item.id}`}
  style={styles.heroImage}
/>
```

---

## FlashList with Pull-to-Refresh

```tsx
import { FlashList } from '@shopify/flash-list';
import { RefreshControl } from 'react-native';

function ProductList() {
  const { data, isLoading, refetch, fetchNextPage, hasNextPage } = useProducts();

  const handleEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <FlashList
      data={data?.pages.flatMap(p => p.items) ?? []}
      renderItem={({ item }) => <ProductCard product={item} />}
      estimatedItemSize={120}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
      ListEmptyComponent={<EmptyState message="No products found" />}
      ListFooterComponent={hasNextPage ? <LoadingSpinner /> : null}
    />
  );
}
```

---

## TanStack Query

```ts
// entities/entry/api/queryKeys.ts
export const entryKeys = {
  all: ['entries'] as const,                                       // invalidate everything
  lists: () => [...entryKeys.all, 'list'] as const,                // all lists
  list: (filters) => [...entryKeys.lists(), filters] as const,     // specific list
  details: () => [...entryKeys.all, 'detail'] as const,            // all details
  detail: (id) => [...entryKeys.details(), id] as const,           // single detail
}
```

```ts
// entities/entry/api/useEntries.ts
export function useEntries(filters: Filters) {
  return useQuery({
    queryKey: entryKeys.list(filters),
    queryFn: () => fetchEntries(filters),
  });
}
```
