---
name: expo-react-native
description: Expo/React Native project conventions - structure, headless patterns, design tokens, and library combinations. Use when building cross-platform mobile apps with Expo.
---

# Expo & React Native Patterns

**Package manager**: Use `bun` for all commands. For latest Expo APIs, use `context7` MCP.

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
├── lib/             # Independent modules (i18n, storage)
├── constants/       # App constants
├── utils/           # Shared utilities
├── hooks/           # Shared custom hooks
├── store/           # Zustand store
└── types/           # Shared types
```

---

## Headless Patterns (Logic/View Separation)

### Core Principle

**Separate WHAT (logic) from HOW (presentation).**

```tsx
// 1. Logic Layer (Hook) - data and actions only
const useSelection = <T,>(items: T[]) => {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  
  const toggle = (item: T) => {
    const next = new Set(selected);
    next.has(item) ? next.delete(item) : next.add(item);
    setSelected(next);
  };

  return {
    selected: Array.from(selected),
    isSelected: (item: T) => selected.has(item),
    toggle,
  };
};

// 2. View Layer (Headless Components) - styles only, flexible via children
const Chip = ({ active, onPress, children }: { 
  active: boolean; 
  onPress: () => void; 
  children: React.ReactNode;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    {children}
  </Pressable>
);

// 3. Composition - assembly only (easy to understand at a glance)
const InterestSelector = () => {
  const interests = ['React', 'Vue', 'Svelte'];
  const { isSelected, toggle } = useSelection(interests);

  return (
    <View style={styles.list}>
      {interests.map((tech) => (
        <Chip key={tech} active={isSelected(tech)} onPress={() => toggle(tech)}>
          <Text>{tech}</Text>
        </Chip>
      ))}
    </View>
  );
};
```

### Real-World Example: Before/After

```tsx
// ❌ Before: 800-line single file
const DiaryHistory = () => {
  const [meals, setMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  // ... 15 more useState
  
  useEffect(() => { /* 100 lines */ }, []);
  // ...
};
```

```tsx
// ✅ After: Main component does composition only
const DiaryHistory = () => {
  const { range, setRange, clear, presets } = useDateRange();
  const { meals, isLoading, loadMore } = useMealHistory({ range });
  const [sortMethod, setSortMethod] = useState<SortMethod>('date-desc');
  const { sections } = useSortedMeals(meals, sortMethod);

  return (
    <Screen>
      <Header onBack={router.back} title="Diary History" />
      <FilterBar range={range} onRangeChange={setRange} sortMethod={sortMethod} onSortChange={setSortMethod} />
      <MealSectionList sections={sections} isLoading={isLoading} onEndReached={loadMore} />
    </Screen>
  );
};
```

### Interface Guidelines

```tsx
// ✅ Hook: Clean, predictable return
const { data, isLoading, error, refetch } = useQuery();
const { selected, toggle, clear } = useSelection();

// ✅ Component: Headless-friendly props
type MealListProps = {
  meals: Meal[];
  renderItem: (meal: Meal) => ReactNode;
  onEndReached?: () => void;
};
```

---

## Design Tokens

```tsx
// tokens/index.ts - no hardcoding, always use tokens
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

## Auth Guard Pattern (Expo Router)

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
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'user-storage', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

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

<form.Field name="email" children={(field) => (
  <Input
    value={field.state.value}
    onChangeText={field.handleChange}
    onBlur={field.handleBlur}
  />
)} />

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

## Animations (Reanimated + Gesture Handler)

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

---

## Performance Conventions

```tsx
// Use FlashList for long lists (not FlatList)
import { FlashList } from '@shopify/flash-list';
<FlashList data={items} renderItem={renderItem} estimatedItemSize={120} />

// Memoize components
const ProductCard = memo(function ProductCard({ product, onPress }) { ... });

// Memoize callbacks passed to children
const handlePress = useCallback((id) => router.push(`/product/${id}`), []);

// Defer heavy work until after navigation
InteractionManager.runAfterInteractions(() => setIsReady(true));
```

---

## Best Practices

1. **Interface-first** - Define hook signatures before implementation
2. **Easy to understand main components** - Composition only, logic goes in hooks
3. **Use tokens** - No hardcoded values
4. **MMKV** - Use instead of AsyncStorage (10x faster)
5. **FlashList** - Use instead of FlatList
6. **Test on physical devices** - Simulators hide performance issues
