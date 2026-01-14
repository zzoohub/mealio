# Ergonomics & Accessibility

Layout guidelines, sizing specifications, and accessibility requirements.

---

## Touch & Click Targets

| Element | Minimum | Recommended |
|---------|---------|-------------|
| Touch target | 44×44pt | 48×48pt |
| Click target | 24×24px | 32×32px |
| Target spacing | 8px | 12px |

### Small Visual, Large Target
```
Visual element can be small if tap area is large:

┌─────────────────┐
│                 │
│    [icon]       │  ← Visual: 24px
│                 │  ← Tap area: 48px
└─────────────────┘
```

---

## Mobile Ergonomics

### Thumb Zone (One-Handed Use)

```
┌─────────────────────┐
│   HARD TO REACH     │  ← Navigation, less-used actions
│                     │
├─────────────────────┤
│                     │
│   COMFORTABLE       │  ← Content, secondary actions
│                     │
├─────────────────────┤
│   EASY / PRIMARY    │  ← Primary actions, key navigation
└─────────────────────┘
```

### Placement Guidelines
- **Primary actions**: Bottom 1/3 of screen
- **Navigation**: Bottom or within thumb reach
- **Destructive actions**: NOT in easy-reach zone (prevent accidents)

### One-Handed Assumptions
- User's other hand is occupied (holding coffee, subway pole)
- Reachability matters more than visual hierarchy
- Bottom sheets > top modals for actions

---

## Response Time

| Threshold | User Perception | Use For |
|-----------|-----------------|---------|
| <100ms | Instant | Button feedback, hover states |
| <300ms | Fast | Transitions, micro-interactions |
| <1000ms | Flow maintained | Page loads, form submissions |
| >1000ms | Needs indicator | Loading states required |

### Feedback Rules
- **Immediate** (<100ms): Visual change on press/click
- **0-300ms**: No loading indicator needed
- **300ms-1s**: Consider skeleton/shimmer
- **>1s**: Loading indicator required
- **>3s**: Progress indicator with context

---

## Visual Spacing

### Component Spacing (Inside)
| Token | Value | Use For |
|-------|-------|---------|
| xs | 4px | Tight grouping (icon + label) |
| sm | 8px | Related items |
| md | 12px | Default component padding |
| lg | 16px | Comfortable component padding |
| xl | 24px | Generous component padding |

### Layout Spacing (Between Sections)
| Token | Value | Use For |
|-------|-------|---------|
| xs | 16px | Related sections |
| sm | 24px | Default section gap |
| md | 32px | Distinct sections |
| lg | 48px | Major section breaks |
| xl | 64px | Page-level divisions |

---

## Accessibility Requirements

### Non-Negotiable (WCAG 2.1 AA)

| Requirement | Specification |
|-------------|---------------|
| Text contrast | 4.5:1 minimum |
| UI component contrast | 3:1 minimum |
| Focus indicator | 2px+ visible outline |
| Touch targets | 44×44pt minimum |

### Color
- **Never** use color as the only indicator
- Always pair with: icon, text, pattern, or position
- Test with colorblind simulators

```
❌ Red = error, Green = success (color only)
✅ ⚠️ Red text + icon = error, ✓ Green text + icon = success
```

### Focus States
```css
/* Visible focus for keyboard users */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Screen Readers
- All interactive elements need accessible names
- Images need alt text (or alt="" if decorative)
- Form inputs need associated labels
- Dynamic content needs aria-live announcements

```tsx
// Icon-only button
<button aria-label="Close">
  <CloseIcon aria-hidden="true" />
</button>

// Form field
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email</span>
```

### Keyboard Navigation
- All interactive elements reachable via Tab
- Logical tab order (visual order = DOM order)
- Escape closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys for menus/tabs

---

## Motion & Animation

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animation Guidelines
| Duration | Use For |
|----------|---------|
| 100-150ms | Micro-interactions (hover, press) |
| 200-300ms | Component transitions (expand, collapse) |
| 300-500ms | Page transitions, modals |

### Avoid
- Flashing content (3+ times per second)
- Auto-playing video/animation without pause control
- Parallax that causes vestibular discomfort

---

## Checklist

### Layout
- [ ] Touch targets ≥44×44pt
- [ ] Primary actions in thumb zone (mobile)
- [ ] Consistent spacing using tokens
- [ ] Visual hierarchy matches importance

### Accessibility
- [ ] Contrast ratios passing (4.5:1 text, 3:1 UI)
- [ ] Focus states visible (2px+ outline)
- [ ] Color not sole indicator
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Reduced motion respected
