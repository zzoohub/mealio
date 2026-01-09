---
name: expo-react-native
description: Expo/React Native patterns including project structure, Expo Router navigation, deep linking, platform-specific code, animations, permissions, and performance. Use when building cross-platform mobile apps with Expo.
---

# Expo & React Native Patterns

## Project Structure

```
app/                 # Expo Router (file-based routing)
src/
├── providers/       # App infrastructure (QueryClient, Overlay, ErrorBoundary)
├── design-system/   # UI system (tokens, headless hooks, styled components)
├── domains/         # Feature modules (fractal structure)
│   └── auth/        # Example domain
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── types/
├── components/      # Shared components (Header, Footer)
├── lib/             # independent modules (i18n, storage)
├── constants/       # App constants
├── utils/           # shared utilities
├── hooks/           # shared custom hooks
├── store/           # zustand store
└── types/           # Shared types
```

---

## Design Tokens Integration

Reference `design-system` skill for token architecture:

```tsx
// tokens/index.ts - use tokens, no hardcoded values
export const tokens = {
  color: {
    bg: { primary: '#ffffff', secondary: '#f9fafb' },
    text: { primary: '#0f172a', secondary: '#475569' },
    interactive: { primary: '#2563eb' },
  },
  spacing: {
    component: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
  radius: { sm: 4, md: 8, lg: 12, full: 9999 },
} as const;

// Usage
const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.bg.primary,
    padding: tokens.spacing.component.lg,
    borderRadius: tokens.radius.md,
  },
});
```

---

## Navigation (Expo Router)

### Root Layout with Auth Guard

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

### Tab Layout

```tsx
// app/(app)/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Navigation Actions

```tsx
const router = useRouter();
router.push('/profile/123');
router.replace('/(app)/home');
router.back();

<Link href="/profile/123"><Text>Profile</Text></Link>
<Link href={{ pathname: '/product/[id]', params: { id: '456' } }}>Product</Link>
```

---

## Deep Linking

### Configuration (app.json)

```json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [{ "action": "VIEW", "autoVerify": true, "data": [{ "scheme": "https", "host": "myapp.com", "pathPrefix": "/" }], "category": ["BROWSABLE", "DEFAULT"] }]
    },
    "ios": { "associatedDomains": ["applinks:myapp.com"] }
  }
}
```

Expo Router handles URL → Route mapping automatically (`myapp://product/123` → `app/product/[id].tsx`).

For Universal Links, host `apple-app-site-association` (iOS) and `assetlinks.json` (Android) at `/.well-known/`.

---

## Platform-Specific Code

```tsx
import { Platform, StyleSheet } from 'react-native';

// Platform.select for style differences
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 20, android: 0 }),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
      android: { elevation: 3 },
    }),
  },
});

// Platform-specific files (auto-selected by bundler)
// Button.tsx (shared), Button.ios.tsx, Button.android.tsx
```

---

## Permissions

All permissions follow the same pattern - request, check status, handle denial:

```tsx
// Camera example (same pattern for Notifications, Location, etc.)
import { Camera } from 'expo-camera';

const [permission, setPermission] = useState<boolean | null>(null);

useEffect(() => {
  Camera.requestCameraPermissionsAsync().then(({ status }) =>
    setPermission(status === 'granted')
  );
}, []);

if (permission === null) return <Loading />;
if (!permission) return <PermissionDenied onOpenSettings={() => Linking.openSettings()} />;
return <Camera style={{ flex: 1 }} />;
```

For push notifications, use `expo-notifications` with `expo-device` (check `Device.isDevice` - tokens don't work on simulators).

---

## State Management

### Zustand with MMKV Persist

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'user-storage', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

### TanStack Query

```typescript
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 60 * 24 } },
});

// Hooks
export function useUser() {
  return useQuery({ queryKey: ['user'], queryFn: fetchUser });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
  });
}
```

Use `createSyncStoragePersister` with MMKV for offline query persistence.

---

## Forms (TanStack Form + Zod)

```tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

const form = useForm({
  defaultValues: { email: '', password: '' },
  validatorAdapter: zodValidator(),
  validators: { onChange: loginSchema },
  onSubmit: async ({ value }) => await login(value),
});

// Field usage
<form.Field name="email" children={(field) => (
  <Input
    value={field.state.value}
    onChangeText={field.handleChange}
    onBlur={field.handleBlur}
  />
)} />

// Submit button with loading state
<form.Subscribe
  selector={(state) => [state.canSubmit, state.isSubmitting]}
  children={([canSubmit, isSubmitting]) => (
    <Button onPress={form.handleSubmit} disabled={!canSubmit || isSubmitting}>
      {isSubmitting ? 'Loading...' : 'Submit'}
    </Button>
  )}
/>
```

---

## Animations

### Reanimated + Gesture Handler

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function SwipeableCard({ children }: { children: React.ReactNode }) {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd((e) => {
      translateX.value = Math.abs(e.translationX) > 120
        ? withTiming(e.translationX > 0 ? 500 : -500)
        : withSpring(0);
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

For simple animations, use `Animated.timing` with `useNativeDriver: true`.

---

## Performance

```tsx
// FlashList for long lists (not FlatList)
import { FlashList } from '@shopify/flash-list';
<FlashList data={items} renderItem={renderItem} estimatedItemSize={120} />

// Memoize components and callbacks
const ProductCard = memo(function ProductCard({ product, onPress }) { ... });
const handlePress = useCallback((id) => router.push(`/product/${id}`), []);

// Defer heavy work until after navigation
InteractionManager.runAfterInteractions(() => setIsReady(true));
```

---

## Offline Support

```tsx
import NetInfo from '@react-native-community/netinfo';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((state) => setIsOnline(state.isConnected ?? false)), []);
  return isOnline;
}
```

---

## Best Practices

1. **Use design tokens** - Import from `@/tokens`, no hardcoded values
2. **MMKV over AsyncStorage** - 10x faster for persistence
3. **FlashList for lists** - Better performance than FlatList
4. **Platform.select** - Handle iOS/Android differences explicitly
5. **Memoize callbacks** - Passed to child components
6. **useNativeDriver: true** - For smooth animations
7. **Test on physical devices** - Simulators hide real performance
