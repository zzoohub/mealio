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

Reference `design-system` skill for token architecture. Use tokens in components:

```tsx
// tokens/index.ts (generated from design-system)
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

// Usage in styles
import { tokens } from '@/tokens';

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
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

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
import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';

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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Navigation Actions

```tsx
import { useRouter, Link } from 'expo-router';

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
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "myapp.com",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "associatedDomains": ["applinks:myapp.com"]
    }
  }
}
```

### Expo Router Deep Links

```
// URL → Route mapping (automatic with Expo Router)
myapp://product/123     → app/product/[id].tsx
https://myapp.com/profile → app/profile.tsx
```

### Handle Incoming Links

```tsx
// app/_layout.tsx
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const url = useURL();
  const router = useRouter();

  useEffect(() => {
    if (url) {
      // Expo Router handles most cases automatically
      // Custom handling if needed:
      const { path, queryParams } = Linking.parse(url);
      console.log('Deep link:', path, queryParams);
    }
  }, [url]);

  return <Slot />;
}
```

### Testing Deep Links

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://product/123"

# Android Emulator
adb shell am start -a android.intent.action.VIEW -d "myapp://product/123"

# Expo Go
npx uri-scheme open "exp://127.0.0.1:8081/--/product/123" --ios
```

### Universal Links Setup

```typescript
// For production: apple-app-site-association (iOS)
// Host at: https://myapp.com/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.myapp.app",
        "paths": ["*"]
      }
    ]
  }
}

// For production: assetlinks.json (Android)
// Host at: https://myapp.com/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.myapp.app",
    "sha256_cert_fingerprints": ["..."]
  }
}]
```

---

## Platform-Specific Code

### Platform.select

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 20, android: 0 }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
      },
      android: { elevation: 3 },
    }),
  },
});
```

### Platform Constants

```typescript
import { Platform, StatusBar, Dimensions } from 'react-native';

export const PLATFORM = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  statusBarHeight: Platform.select({
    ios: 20,
    android: StatusBar.currentHeight || 0,
  }),
  keyboardBehavior: Platform.select({
    ios: 'padding',
    android: 'height',
  }) as 'padding' | 'height',
  ...Dimensions.get('window'),
};
```

### Platform-Specific Files

```
Button.tsx          # Shared
Button.ios.tsx      # iOS (auto-selected)
Button.android.tsx  # Android (auto-selected)
```

---

## Permissions

### Camera

```tsx
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

### Push Notifications

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Location

```typescript
import * as Location from 'expo-location';

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission denied');
  }

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return coords;
}
```

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

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

### TanStack Query with MMKV Persistence

```typescript
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
});

// In App.tsx
<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
  {children}
</PersistQueryClientProvider>
```

### TanStack Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
```

---

## Forms (TanStack Form + Zod)

```tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

function LoginForm() {
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await login(value);
    },
  });

  return (
    <View style={styles.form}>
      <form.Field
        name="email"
        children={(field) => (
          <View>
            <Input
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {field.state.meta.errors?.[0] && (
              <Text style={styles.error}>{field.state.meta.errors[0]}</Text>
            )}
          </View>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <View>
            <Input
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              placeholder="Password"
              secureTextEntry
            />
            {field.state.meta.errors?.[0] && (
              <Text style={styles.error}>{field.state.meta.errors[0]}</Text>
            )}
          </View>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            onPress={form.handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        )}
      />
    </View>
  );
}
```

---

## Animations

### Animated API

```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>
```

### Reanimated + Gesture Handler

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function SwipeableCard({ children }: { children: React.ReactNode }) {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const shouldDismiss = Math.abs(e.translationX) > 120;
      if (shouldDismiss) {
        translateX.value = withTiming(e.translationX > 0 ? 500 : -500);
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

---

## Performance

### FlashList for Long Lists

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={products}
  renderItem={({ item }) => <ProductCard product={item} />}
  estimatedItemSize={120}
  keyExtractor={(item) => item.id}
/>
```

### Memoization

```tsx
const ProductCard = memo(function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Text>{product.name}</Text>
    </Pressable>
  );
});

// Parent component
const handlePress = useCallback((id: string) => {
  router.push(`/product/${id}`);
}, []);
```

### InteractionManager

```tsx
useEffect(() => {
  InteractionManager.runAfterInteractions(() => {
    setIsReady(true);
  });
}, []);
```

---

## Offline Support

### Network Status Hook

```tsx
import NetInfo from '@react-native-community/netinfo';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
  }, []);

  return isOnline;
}
```

### Offline Indicator Component

```tsx
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text>You're offline. Some features may be unavailable.</Text>
    </View>
  );
}
```

---

## Constants

```typescript
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const LAYOUT = {
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 49,
  SPACING: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
} as const;

export const GESTURE = {
  SWIPE_THRESHOLD: 120,
  VELOCITY_THRESHOLD: 500,
} as const;
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
8. **Configure deep links early** - Universal links need server setup
9. **TanStack Form for forms** - Type-safe, performant validation
10. **TanStack Query for server state** - Caching, offline support
