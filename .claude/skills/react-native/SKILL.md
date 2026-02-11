---
name: react-native
description: |
  React Native (Expo) project conventions and patterns.
  Use when: building cross-platform mobile apps with Expo, React Native screens, mobile-specific logic.
  Do not use for: UX decisions (use ux-design), token/component design (use design-system), web-only features.
  Workflow: this skill (building mobile apps) -> vercel-react-native-skills (refactoring and performance optimization if needed).
references:
  - examples.md    # Auth Guard, State Persistence, Forms, Animations code
---

# Expo & React Native Patterns

**For latest APIs, use context7.**

**Package manager**: Use `bun` for all commands.

---

## Project Structure (Feature-Sliced Design)

**For Feature-Sliced Design structure use Context7**

```
app/                 # Expo Router (file-based routing)
├── _layout.tsx      # Root layout
├── index.tsx        # Home (/)
└── some-page/
    └── index.tsx    # /some-page (routing + page composition)
src/
├── app/             # App-wide settings, providers, global styles
│   └── providers/
├── widgets/         # Large composite blocks (Header, Sidebar, Feed)
├── features/        # User interactions (auth, send-comment, add-to-cart)
│   └── auth/
│       ├── ui/
│       ├── model/
│       └── api/
├── entities/        # Business entities (user, product, order)
│   └── user/
│       ├── ui/
│       ├── model/
│       └── api/
└── shared/          # Reusable infrastructure
    ├── ui/          # Design system
    ├── lib/         # Utilities, helpers
    ├── api/         # API client
    └── config/      # Environment, constants
```

### FSD Layer Rules

| Layer | Can import from | Cannot import from |
|-------|-----------------|-------------------|
| `app` | All layers below | - |
| `widgets` | features, entities, shared | app |
| `features` | entities, shared | app, widgets |
| `entities` | shared | app, widgets, features |
| `shared` | - | All layers above |

**Rule: Layers can only import from layers below. Never above.**

---

## Preferred Stack

| Category | Choice | Why |
|----------|--------|-----|
| State (server) | TanStack Query | Caching, background sync |
| State (client) | Zustand | Simple, no boilerplate |
| Storage | MMKV | 10x faster than AsyncStorage |
| Forms | TanStack Form + Zod | Type-safe, good validation |
| Lists | FlashList | Recycling, better perf than FlatList |
| Animation | Reanimated + Gesture Handler | 60fps, runs on UI thread |
| Images | Expo Image | Fast, supports caching |

---

## Headless Patterns

**Rule: Separate WHAT (logic) from HOW (presentation).**

```tsx
// ❌ Before: 800-line single file with 15 useStates
const DiaryHistory = () => {
  const [meals, setMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // ... 500+ lines
};
```

```tsx
// ✅ After: Main component is composition only
const DiaryHistory = () => {
  const { range, setRange } = useDateRange();
  const { meals, isLoading, loadMore } = useMealHistory({ range });
  const { sections } = useSortedMeals(meals);

  return (
    <Screen>
      <FilterBar range={range} onRangeChange={setRange} />
      <MealSectionList sections={sections} onEndReached={loadMore} />
    </Screen>
  );
};
```

**Rule: Main component does composition only. Logic goes in hooks.**

### Hook Interface Guidelines

```tsx
// ✅ Clean, predictable return
const { data, isLoading, error, refetch } = useQuery();
const { selected, toggle, clear } = useSelection();
```

---

## Performance Rules

| Rule | Why |
|------|-----|
| FlashList over FlatList | Recycling, handles 10k+ items |
| Memoize components with callbacks | Prevent unnecessary re-renders |
| `useCallback` for handlers passed down | Stable references |
| `InteractionManager.runAfterInteractions` | Defer heavy work until after navigation |
| Test on physical device | Simulators hide real performance issues |

**Rule: If it scrolls, use FlashList. If it's slow, profile on real device.**

---

## Cross-Platform & Multi-Device

| Rule | Detail |
|------|--------|
| No fixed container widths | Use flex, `%`, or `useWindowDimensions()` derived values |
| `Platform.select` for styles | Shadows: iOS `shadow*` props vs Android `elevation` |
| `Platform.OS` for behavior | Action sheets, pickers, keyboard behavior differ per OS |
| Optional chaining in Alert handlers | Android `Alert.alert` onPress callbacks need `cb?.()` |
| `useSafeAreaInsets` for notches | Never hardcode status bar heights |
| FlashList needs `estimatedItemSize` | Without it, falls back to ScrollView — may crash Android |
| Fixed-height + `overflow: "hidden"` | Use `allowFontScaling={false}` or scale height with `fontScale` |
| Compact UI chrome (tabs, selectors, badges) | `allowFontScaling={false}` — these are visual chrome, not readable content |
| Detect device locale on first launch | `Localization.getLocales()[0]?.languageCode` — never hardcode default language |
| Font scale design target | Design for up to ~1.35x `fontScale`. Must not crash at 2.0x |

### iOS vs Android Differences

| Concern | iOS | Android |
|---------|-----|---------|
| Action sheets | `ActionSheetIOS` | `Alert.alert` with buttons |
| Date/time pickers | BottomSheet + spinner | Native dialog |
| OAuth providers | Apple + Google | Google only (needs SHA-1 in console) |
| Keyboard avoidance | `behavior="padding"` | `behavior="height"` or manifest config |
| Shadows | `shadow*` props | `elevation` only |
| `overflow: "hidden"` | Clips as expected | May not clip absolute children |

---

## Quick Checklist

### Architecture
- [ ] Main component is composition only (no 15 useStates)
- [ ] Logic extracted to custom hooks
- [ ] Hook interfaces are clean and predictable

### Performance
- [ ] Using FlashList with `estimatedItemSize` (not FlatList)
- [ ] Components memoized where needed
- [ ] Heavy work deferred with InteractionManager
- [ ] Tested on physical device (not just simulator)

### State & Data
- [ ] Server state in TanStack Query
- [ ] Client state in Zustand
- [ ] Persistent state uses MMKV (not AsyncStorage)

### Cross-Platform & Devices
- [ ] Works on both iOS and Android
- [ ] Platform-specific behavior branched with `Platform.OS`
- [ ] Safe areas handled, keyboard doesn't cover inputs
- [ ] No fixed pixel widths — flex or dimension-derived
- [ ] Large font sizes (~1.35x) don't clip fixed-height components
- [ ] Compact UI chrome uses `allowFontScaling={false}`
- [ ] Device locale detected on first launch

### Design System
- [ ] Using tokens from design-system (no hardcoded values)
- [ ] Touch targets 44pt+

## Security Configuration

| Item | Value |
|------|-------|
| Token storage | SecureStore (not AsyncStorage) |
| JWT access token | 1 hour |
| JWT refresh token | 1 year |
| Certificate pinning | Required for sensitive APIs |
