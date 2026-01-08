---
name: expo-react-native
description: Expo/React Native patterns including project structure, Expo Router navigation, platform-specific code, animations, permissions, and performance. Use when building cross-platform mobile apps with Expo.
---

# Expo & React Native Patterns

## Project Structure

```
src/
├── app/                      # Expo Router
│   ├── (auth)/               # Auth group
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (app)/                # Main app
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── home.tsx
│   │       └── profile.tsx
│   ├── _layout.tsx           # Root layout
│   └── +not-found.tsx
├── components/ui/            # Button, Input, Card
├── domains/                  # Feature modules
├── hooks/
├── stores/                   # Zustand
└── constants/
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
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
      }} />
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

## Platform-Specific Code

### Platform.select

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 20, android: 0 }),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
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
  statusBarHeight: Platform.select({ ios: 20, android: StatusBar.currentHeight || 0 }),
  keyboardBehavior: Platform.select({ ios: 'padding', android: 'height' }) as const,
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

## Styling

### StyleSheet with Theme

```tsx
const useStyles = () => {
  const { colors, spacing } = useTheme();
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      elevation: 3,
    },
  });
};
```

### Responsive Sizing

```typescript
const { width } = Dimensions.get('window');
const baseWidth = 375;
export const scale = (size: number) => (width / baseWidth) * size;
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
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
if (!permission) return <PermissionDenied />;
return <Camera style={{ flex: 1 }} />;
```

### Push Notifications

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function getPushToken() {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync()).data;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
  }),
});
```

### Location

```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') throw new Error('Permission denied');
const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
```

---

## State Management

### Zustand with Persist

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'user-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

### React Query

```typescript
export function useUser() {
  return useQuery({ queryKey: ['user'], queryFn: fetchUser, staleTime: 5 * 60 * 1000 });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
  });
}
```

---

## Animations

### Animated API

```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1, duration: 300, useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>
```

### Reanimated + Gesture

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const translateX = useSharedValue(0);

const gesture = Gesture.Pan()
  .onUpdate((e) => { translateX.value = e.translationX; })
  .onEnd((e) => {
    translateX.value = Math.abs(e.translationX) > 120
      ? withTiming(e.translationX > 0 ? 500 : -500)
      : withSpring(0);
  });

const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

<GestureDetector gesture={gesture}>
  <Animated.View style={style}>{children}</Animated.View>
</GestureDetector>
```

---

## Forms (React Hook Form + Zod)

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

<Controller
  control={control}
  name="email"
  render={({ field: { onChange, value } }) => (
    <Input value={value} onChangeText={onChange} error={errors.email?.message} />
  )}
/>
```

---

## Performance

### FlashList

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
const ProductCard = memo(({ product, onPress }) => (
  <Pressable onPress={() => onPress(product.id)}>
    <Text>{product.name}</Text>
  </Pressable>
));

const handlePress = useCallback((id) => router.push(`/product/${id}`), []);
```

### InteractionManager

```tsx
useEffect(() => {
  InteractionManager.runAfterInteractions(() => setIsReady(true));
}, []);
```

---

## Constants

```typescript
export const ANIMATION = { FAST: 150, NORMAL: 300, SLOW: 500 } as const;
export const LAYOUT = { HEADER: 60, TAB_BAR: 49, SPACING: { xs: 4, sm: 8, md: 16, lg: 24 } } as const;
export const GESTURE = { SWIPE_THRESHOLD: 120, VELOCITY_THRESHOLD: 500 } as const;
```

---

## Best Practices

1. **Functional components only**
2. **Immutable state** - never mutate
3. **Platform.select** for iOS/Android differences
4. **FlashList** for long lists
5. **Memoize** callbacks passed to children
6. **Named constants** - no magic numbers
