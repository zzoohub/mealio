---
name: expo-react-native
description: |
  Expo/React Native project conventions and patterns.
  Use when: building cross-platform mobile apps with Expo, React Native screens, mobile-specific logic.
  Do not use for: UX decisions (use ux-design), token/component design (use design-system), web-only features.
  Workflow: ux-design → design-system → this skill (mobile integration).
references:
  - examples.md    # Auth Guard, State Persistence, Forms, Animations code
---

# Expo & React Native Patterns

**For latest APIs, use context7 MCP server with library-id `facebook/react-native` or `expo/expo` .**

**Package manager**: Use `bun` for all commands.

---

## Project Structure (Feature-Sliced Design)

**Use Context7 MCP server with `websites/feature-sliced_github_io`**

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
    ├── ui/          # Design system components
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

## Quick Checklist

### Architecture
- [ ] Main component is composition only (no 15 useStates)
- [ ] Logic extracted to custom hooks
- [ ] Hook interfaces are clean and predictable

### Performance
- [ ] Using FlashList for lists (not FlatList)
- [ ] Components memoized where needed
- [ ] Heavy work deferred with InteractionManager
- [ ] Tested on physical device (not just simulator)

### State & Data
- [ ] Server state in TanStack Query
- [ ] Client state in Zustand
- [ ] Persistent state uses MMKV (not AsyncStorage)

### Platform
- [ ] Works on both iOS and Android
- [ ] Safe areas handled
- [ ] Keyboard doesn't cover inputs

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
