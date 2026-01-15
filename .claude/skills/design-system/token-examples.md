# Token Examples

W3C Design Token Community Group (DTCG) format examples.

---

## File Structure

```
src/shared/ui/tokens/
├── primitive.tokens.json
├── semantic.tokens.json
└── themes/
    ├── light.tokens.json
    └── dark.tokens.json
```

---

## Primitive Tokens (Tier 1)

Raw values with no semantic meaning. Never use directly in components.

```json
{
  "color": {
    "gray": {
      "50": { "$value": "#f9fafb", "$type": "color" },
      "100": { "$value": "#f3f4f6", "$type": "color" },
      "200": { "$value": "#e5e7eb", "$type": "color" },
      "300": { "$value": "#d1d5db", "$type": "color" },
      "400": { "$value": "#9ca3af", "$type": "color" },
      "500": { "$value": "#6b7280", "$type": "color" },
      "600": { "$value": "#4b5563", "$type": "color" },
      "700": { "$value": "#374151", "$type": "color" },
      "800": { "$value": "#1f2937", "$type": "color" },
      "900": { "$value": "#111827", "$type": "color" },
      "950": { "$value": "#030712", "$type": "color" }
    },
    "blue": {
      "500": { "$value": "#3b82f6", "$type": "color" },
      "600": { "$value": "#2563eb", "$type": "color" },
      "700": { "$value": "#1d4ed8", "$type": "color" }
    },
    "red": {
      "500": { "$value": "#ef4444", "$type": "color" },
      "600": { "$value": "#dc2626", "$type": "color" }
    },
    "green": {
      "500": { "$value": "#22c55e", "$type": "color" },
      "600": { "$value": "#16a34a", "$type": "color" }
    }
  },
  "spacing": {
    "0": { "$value": "0px", "$type": "dimension" },
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "10": { "$value": "40px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" }
  },
  "radius": {
    "none": { "$value": "0px", "$type": "dimension" },
    "sm": { "$value": "4px", "$type": "dimension" },
    "md": { "$value": "8px", "$type": "dimension" },
    "lg": { "$value": "12px", "$type": "dimension" },
    "xl": { "$value": "16px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  },
  "fontWeight": {
    "normal": { "$value": "400", "$type": "fontWeight" },
    "medium": { "$value": "500", "$type": "fontWeight" },
    "semibold": { "$value": "600", "$type": "fontWeight" },
    "bold": { "$value": "700", "$type": "fontWeight" }
  },
  "fontSize": {
    "xs": { "$value": "12px", "$type": "dimension" },
    "sm": { "$value": "14px", "$type": "dimension" },
    "base": { "$value": "16px", "$type": "dimension" },
    "lg": { "$value": "18px", "$type": "dimension" },
    "xl": { "$value": "20px", "$type": "dimension" },
    "2xl": { "$value": "24px", "$type": "dimension" },
    "3xl": { "$value": "30px", "$type": "dimension" }
  }
}
```

---

## Semantic Tokens (Tier 2)

Intent-based tokens that reference primitives. Use these in components.

```json
{
  "color": {
    "bg": {
      "primary": { "$value": "{color.gray.50}", "$type": "color" },
      "secondary": { "$value": "{color.gray.100}", "$type": "color" },
      "tertiary": { "$value": "{color.gray.200}", "$type": "color" },
      "inverse": { "$value": "{color.gray.900}", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "{color.gray.900}", "$type": "color" },
      "secondary": { "$value": "{color.gray.600}", "$type": "color" },
      "tertiary": { "$value": "{color.gray.500}", "$type": "color" },
      "inverse": { "$value": "{color.gray.50}", "$type": "color" },
      "link": { "$value": "{color.blue.600}", "$type": "color" }
    },
    "interactive": {
      "primary": { "$value": "{color.blue.600}", "$type": "color" },
      "primaryHover": { "$value": "{color.blue.700}", "$type": "color" },
      "primaryActive": { "$value": "{color.blue.800}", "$type": "color" }
    },
    "border": {
      "default": { "$value": "{color.gray.200}", "$type": "color" },
      "strong": { "$value": "{color.gray.300}", "$type": "color" },
      "focus": { "$value": "{color.blue.500}", "$type": "color" }
    },
    "status": {
      "error": { "$value": "{color.red.600}", "$type": "color" },
      "errorBg": { "$value": "{color.red.50}", "$type": "color" },
      "success": { "$value": "{color.green.600}", "$type": "color" },
      "successBg": { "$value": "{color.green.50}", "$type": "color" }
    }
  },
  "spacing": {
    "component": {
      "xs": { "$value": "{spacing.1}", "$type": "dimension" },
      "sm": { "$value": "{spacing.2}", "$type": "dimension" },
      "md": { "$value": "{spacing.3}", "$type": "dimension" },
      "lg": { "$value": "{spacing.4}", "$type": "dimension" },
      "xl": { "$value": "{spacing.6}", "$type": "dimension" }
    },
    "layout": {
      "xs": { "$value": "{spacing.4}", "$type": "dimension" },
      "sm": { "$value": "{spacing.6}", "$type": "dimension" },
      "md": { "$value": "{spacing.8}", "$type": "dimension" },
      "lg": { "$value": "{spacing.12}", "$type": "dimension" },
      "xl": { "$value": "{spacing.16}", "$type": "dimension" }
    }
  }
}
```

---

## Dark Theme (Remaps Semantic)

Only remaps semantic tokens. Primitives stay the same.

```json
{
  "color": {
    "bg": {
      "primary": { "$value": "{color.gray.900}", "$type": "color" },
      "secondary": { "$value": "{color.gray.800}", "$type": "color" },
      "tertiary": { "$value": "{color.gray.700}", "$type": "color" },
      "inverse": { "$value": "{color.gray.50}", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "{color.gray.50}", "$type": "color" },
      "secondary": { "$value": "{color.gray.300}", "$type": "color" },
      "tertiary": { "$value": "{color.gray.400}", "$type": "color" },
      "inverse": { "$value": "{color.gray.900}", "$type": "color" },
      "link": { "$value": "{color.blue.400}", "$type": "color" }
    },
    "border": {
      "default": { "$value": "{color.gray.700}", "$type": "color" },
      "strong": { "$value": "{color.gray.600}", "$type": "color" }
    }
  }
}
```

---

## Component Tokens (Tier 3 - Optional)

Only when a component needs to deviate from semantic tokens.

```json
{
  "button": {
    "primary": {
      "bg": { "$value": "{color.interactive.primary}", "$type": "color" },
      "bgHover": { "$value": "{color.interactive.primaryHover}", "$type": "color" },
      "text": { "$value": "{color.text.inverse}", "$type": "color" }
    },
    "borderRadius": { "$value": "{radius.md}", "$type": "dimension" },
    "paddingX": {
      "sm": { "$value": "{spacing.component.md}", "$type": "dimension" },
      "md": { "$value": "{spacing.component.lg}", "$type": "dimension" },
      "lg": { "$value": "{spacing.component.xl}", "$type": "dimension" }
    }
  }
}
```

---

## Usage in Code

### Web (CSS)

```css
.button-primary {
  background-color: var(--color-interactive-primary);
  color: var(--color-text-inverse);
  padding: var(--spacing-component-md) var(--spacing-component-lg);
  border-radius: var(--radius-md);
}

.button-primary:hover {
  background-color: var(--color-interactive-primaryHover);
}
```

### React Native

```typescript
import { tokens } from '@/tokens';

const styles = StyleSheet.create({
  buttonPrimary: {
    backgroundColor: tokens.color.interactive.primary,
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
  },
});
```
