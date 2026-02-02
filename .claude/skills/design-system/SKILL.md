---
name: design-system
description: |
  Design token systems and component architecture for web and React Native.
  Use when: implementing design-system, building UI components, defining tokens, creating themed interfaces.
  Do not use for: UX decisions (use ux-design), business logic, data fetching.
  Workflow: ux-design (what/why) → this skill (tokens, components) → nextjs/react-native (integration).
references:
  - token-examples.md    # W3C DTCG format examples, theme files
  - examples.md          # Headless hooks, Compound components examples
---

# Design System

## Token Architecture

### Multi-Tier Hierarchy

```
Tier 1: Primitive     →  Raw values, no meaning
Tier 2: Semantic      →  Intent/purpose ← USE THIS
Tier 3: Component     →  (Optional) Component-specific overrides
```

```
color.blue.500              (primitive) - NEVER use directly
    ↓
color.interactive.primary   (semantic) ← use this in components
    ↓
button.bg.primary           (component, optional)
```

**Rule: Components only reference Semantic tokens. Never Primitive.**

### Why 3 Tiers?

| Change | What to update | Impact |
|--------|----------------|--------|
| Brand refresh | Tier 1 (Primitive) | All semantics auto-update |
| Dark mode | Tier 2 (Semantic) | Components unchanged |
| One-off exception | Tier 3 (Component) | Isolated change |

### Semantic Token Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `color.bg.*` | Backgrounds | primary, secondary, inverse |
| `color.text.*` | Typography | primary, secondary, link |
| `color.interactive.*` | Actions | primary, primaryHover, primaryActive |
| `color.border.*` | Borders | default, strong, focus |
| `color.status.*` | Feedback | error, success, warning |
| `spacing.component.*` | Inside components | xs, sm, md, lg, xl |
| `spacing.layout.*` | Between sections | xs, sm, md, lg, xl |

---

## Component Architecture

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

**Rule: Headless handles behavior. Styled handles appearance. Never mix.**

### Why Separate?

| Change | What to update | Other layer |
|--------|----------------|-------------|
| Keyboard navigation fix | Headless hook | Styled unchanged |
| Brand color change | Styled component | Headless unchanged |
| New accessibility requirement | Headless hook | Styled unchanged |

### File Structure

```
src/shared/ui/
├── tokens/          # primitive, semantic, themes
├── headless/        # useButton, useToggle, useDialog
├── styled/          # Button, Toggle, Dialog (uses headless)
├── primitives/      # Box, Text, Stack
└── patterns/        # FormField, ConfirmDialog
```

---

## Preferred Patterns

| Pattern | Preferred | Avoid | Why |
|---------|-----------|-------|-----|
| Props | `variant="primary" size="lg"` | `primary large` (booleans) | Explicit, mutually exclusive |
| Composition | `<Card><Card.Header>` | `<Card showHeader headerTitle="">` | Flexible, readable |
| Polymorphic | `<Box as="section">` | Separate `<Section>` component | Semantic HTML, less components |
| State | Headless hook + Styled | Mixed logic/styles | Separation of concerns |

**Rule: Variant props over booleans. Composition over configuration.**

---

## Platform Output

### Web (CSS Custom Properties)

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #0f172a;
  --color-interactive-primary: #2563eb;
}

[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f9fafb;
}
```

### React Native (TypeScript)

```typescript
export const tokens = {
  color: {
    bg: { primary: '#ffffff', secondary: '#f9fafb' },
    text: { primary: '#0f172a', secondary: '#475569' },
    interactive: { primary: '#2563eb' },
  },
  spacing: {
    component: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
} as const;
```

---

## Accessibility Requirements

| Requirement | Value | Non-negotiable |
|-------------|-------|----------------|
| Text contrast | 4.5:1 minimum | ✅ |
| UI component contrast | 3:1 minimum | ✅ |
| Focus indicator | 2px+ visible outline | ✅ |
| Touch targets | 44×44pt minimum | ✅ |

**Rule: Color is never the only indicator. Always pair with icon, text, or pattern.**

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

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

## Quick Checklist

### Tokens
- [ ] No hardcoded values in components (colors, spacing, etc.)
- [ ] Using Semantic tokens, not Primitive
- [ ] Dark theme remaps Semantic tokens only

### Components
- [ ] Headless hook for behavior + a11y
- [ ] Styled component uses tokens only
- [ ] Using `variant` / `size` / `colorScheme` props (not booleans)
- [ ] All states defined: default, hover, focus, active, disabled, loading

### Accessibility
- [ ] Color not sole indicator
- [ ] Focus visible (2px+ outline)
- [ ] Touch targets 44pt+
- [ ] Reduced motion respected
- [ ] ARIA attributes correct
