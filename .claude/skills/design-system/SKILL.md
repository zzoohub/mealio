---
name: design-system
description: Modern design token systems and headless component architecture. Covers W3C DTCG tokens, multi-tier hierarchy, headless/styled separation, compound components, and accessibility. Use when building design systems for web or React Native.
---

# Design System

## 1. Token Architecture

### Multi-Tier Hierarchy

```
Tier 1: Primitive     →  Raw values, no meaning, NEVER use directly
Tier 2: Semantic      →  Intent/purpose, USE in components
Tier 3: Component     →  (Optional) Component-specific overrides
```

```
color.blue.500              (primitive)
    ↓
color.interactive.primary   (semantic) ← use this
    ↓
button.bg.primary           (component, optional)
```

**Why?**
- Change Tier 1 → Brand refresh
- Change Tier 2 → Theme switching (dark mode)
- Change Tier 3 → Component exceptions

### W3C DTCG Format

```
tokens/
├── primitive.tokens.json
├── semantic.tokens.json
└── themes/
    ├── light.tokens.json
    └── dark.tokens.json
```

**Primitive** (raw values):
```json
{
  "color": {
    "blue": {
      "600": { "$value": "#2563eb", "$type": "color" }
    }
  },
  "spacing": {
    "4": { "$value": "16px", "$type": "dimension" }
  }
}
```

**Semantic** (intent):
```json
{
  "color": {
    "interactive": {
      "primary": { "$value": "{color.blue.600}", "$type": "color" }
    }
  },
  "spacing": {
    "component": {
      "md": { "$value": "{spacing.4}", "$type": "dimension" }
    }
  }
}
```

**Theme** (remaps semantic):
```json
{
  "color": {
    "bg": {
      "primary": { "$value": "{color.gray.900}", "$type": "color" }
    }
  }
}
```

### Semantic Token Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `color.bg.*` | Backgrounds | primary, secondary, inverse |
| `color.text.*` | Typography | primary, secondary, inverse, link |
| `color.interactive.*` | Actions | primary, primaryHover, primaryActive |
| `color.border.*` | Borders | default, strong, focus |
| `color.status.*` | Feedback | error, success, warning |
| `spacing.component.*` | Inside components | xs, sm, md, lg, xl |
| `spacing.layout.*` | Between sections | xs, sm, md, lg, xl |

### Platform Output

**Web (CSS Custom Properties):**
```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #0f172a;
  --color-interactive-primary: #2563eb;
  --spacing-component-md: 12px;
}

[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f9fafb;
}
```

**React Native (TypeScript):**
```typescript
export const tokens = {
  color: {
    bg: { primary: '#ffffff', secondary: '#f9fafb' },
    text: { primary: '#0f172a', secondary: '#475569' },
    interactive: { primary: '#2563eb', primaryHover: '#1d4ed8' },
  },
  spacing: {
    component: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
} as const;
```

---

## 2. Component Architecture

### Headless + Styled Separation

```
┌──────────────────────────────────────┐
│  Headless Layer                      │
│  Behavior + A11y + Keyboard          │
│  No styles, reusable across brands   │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Styled Layer                        │
│  Headless + Tokens = UI Component    │
└──────────────────────────────────────┘
```

### File Structure

```
components/
├── headless/        # useButton, useToggle, useDialog
├── styled/          # Button, Toggle, Dialog (uses headless)
├── primitives/      # Box, Text, Stack
└── patterns/        # FormField, ConfirmDialog
```

### Headless Hook Example

```typescript
// headless/useButton.ts
interface UseButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

export function useButton(props: UseButtonProps) {
  const { disabled, loading, onPress } = props;
  const isDisabled = disabled || loading;

  return {
    buttonProps: {
      role: 'button',
      tabIndex: isDisabled ? -1 : 0,
      'aria-disabled': isDisabled,
      'aria-busy': loading,
      onClick: () => !isDisabled && onPress?.(),
      onKeyDown: (e) => {
        if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onPress?.();
        }
      },
    },
    state: { isDisabled, isLoading: loading },
  };
}
```

### Styled Component Example

```tsx
// styled/Button.tsx
import { useButton } from '../headless/useButton';
import { tokens } from '@/tokens';

const variants = {
  solid: { bg: tokens.color.interactive.primary, text: tokens.color.text.inverse },
  outline: { bg: 'transparent', text: tokens.color.interactive.primary, border: tokens.color.interactive.primary },
  ghost: { bg: 'transparent', text: tokens.color.interactive.primary },
};

const sizes = {
  sm: { px: tokens.spacing.component.md, py: tokens.spacing.component.xs, fontSize: 14 },
  md: { px: tokens.spacing.component.lg, py: tokens.spacing.component.sm, fontSize: 16 },
  lg: { px: tokens.spacing.component.xl, py: tokens.spacing.component.md, fontSize: 18 },
};

export function Button({ variant = 'solid', size = 'md', ...props }) {
  const { buttonProps, state } = useButton(props);
  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable
      {...buttonProps}
      style={({ pressed }) => ({
        backgroundColor: pressed ? v.bgActive : v.bg,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: tokens.radius.md,
        opacity: state.isDisabled ? 0.5 : 1,
      })}
    >
      <Text style={{ color: v.text, fontSize: s.fontSize }}>
        {props.children}
      </Text>
    </Pressable>
  );
}
```

---

## 3. Component Patterns

### Polymorphic `as` Prop

```tsx
// Usage
<Box as="section" p="lg">Content</Box>
<Text as="h1" size="2xl">Heading</Text>

// Implementation
function Box({ as: Component = 'div', p, m, ...props }) {
  return (
    <Component
      style={{
        padding: p && tokens.spacing.component[p],
        margin: m && tokens.spacing.component[m],
      }}
      {...props}
    />
  );
}
```

### Compound Components

```tsx
// Usage
<Card variant="elevated">
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Content>Body</Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>

// Implementation
const CardContext = createContext(null);

function CardRoot({ variant = 'elevated', children }) {
  return (
    <CardContext.Provider value={{ variant }}>
      <View style={styles[variant]}>{children}</View>
    </CardContext.Provider>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: ({ children }) => <View style={styles.header}>{children}</View>,
  Title: ({ children }) => <Text style={styles.title}>{children}</Text>,
  Content: ({ children }) => <View style={styles.content}>{children}</View>,
  Footer: ({ children }) => <View style={styles.footer}>{children}</View>,
});
```

### Variant Props (Not Booleans)

```tsx
// ❌ Avoid
<Button primary large outline />

// ✅ Prefer
<Button variant="outline" colorScheme="primary" size="lg" />
```

---

## 4. Dark Mode

### Web (CSS + data-theme)

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #0f172a;
}

[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f9fafb;
}
```

### Theme Provider

```tsx
// Minimal implementation
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const resolved = theme === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Prevent Flash (Next.js)

```tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: `
    (function() {
      const theme = localStorage.getItem('theme') || 'system';
      const dark = theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
        : theme === 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    })();
  `}} />
</head>
```

---

## 5. Accessibility

### Required States

| State | Selector | Required |
|-------|----------|----------|
| Default | - | ✅ |
| Hover | `:hover` | ✅ |
| Focus | `:focus-visible` | ✅ |
| Active | `:active` | ✅ |
| Disabled | `:disabled`, `[aria-disabled]` | ✅ |
| Loading | `[aria-busy]` | ✅ |

### Focus Visible

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

### ARIA Essentials

```tsx
// Loading
<button aria-busy={loading} aria-disabled={loading}>

// Icon-only
<button aria-label="Close"><CloseIcon aria-hidden="true" /></button>

// Toggle
<button role="switch" aria-checked={isOn}>

// Error
<input aria-invalid={hasError} aria-describedby="error-id" />
<span id="error-id" role="alert">{error}</span>
```

### Minimums

| Requirement | Value |
|-------------|-------|
| Text contrast | 4.5:1 |
| UI contrast | 3:1 |
| Touch target | 44×44px |
| Focus outline | 2px+ |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Quality Checklist

### Tokens
- [ ] Primitives = raw values only
- [ ] Semantics = intent (bg, text, interactive, border, status)
- [ ] No hardcoded values in components
- [ ] Dark theme remaps semantics

### Components
- [ ] Headless hook for behavior + a11y
- [ ] Styled component uses tokens only
- [ ] `variant` / `size` / `colorScheme` props
- [ ] All states: default, hover, focus, active, disabled, loading

### Accessibility
- [ ] Correct `role` attribute
- [ ] Required `aria-*` attributes
- [ ] Keyboard navigation works
- [ ] Focus visible (2px+)
- [ ] Contrast passing
- [ ] Touch targets 44px+
- [ ] Reduced motion respected
