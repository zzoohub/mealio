# Component Patterns

---

## Headless Hook Pattern

Separates behavior from presentation. Headless handles a11y + keyboard + state. Styled applies tokens.

```typescript
// headless/useToggle.ts — controlled + uncontrolled pattern
interface UseToggleProps {
  defaultValue?: boolean;
  value?: boolean;          // controlled
  onChange?: (value: boolean) => void;
}

export function useToggle(props: UseToggleProps) {
  const { defaultValue = false, value: controlledValue, onChange } = props;
  const [internalValue, setInternalValue] = useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const isOn = isControlled ? controlledValue : internalValue;

  const toggle = useCallback(() => {
    const newValue = !isOn;
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
  }, [isOn, isControlled, onChange]);

  return {
    toggleProps: { role: 'switch', 'aria-checked': isOn, onClick: toggle },
    state: { isOn },
    toggle,
  };
}
```

**Rule: Every headless hook must support both controlled (`value` prop) and uncontrolled (`defaultValue`) modes.**

Claude can derive useButton, useDialog, etc. from this pattern. Key requirements:
- `role`, `aria-*`, `tabIndex` in returned props object
- Keyboard handling (Enter/Space for buttons, Escape for dialogs)
- Focus trapping for modals (query focusable elements, handle Tab/Shift+Tab)

---

## Styled Component (Using Headless + Tokens)

```tsx
// styled/Button.tsx
import { useButton } from '../headless/useButton';
import { tokens } from '@/shared/ui/tokens';

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

interface ButtonProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = 'solid', size = 'md', children, ...props }: ButtonProps) {
  const { buttonProps, state } = useButton(props);
  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable {...buttonProps} style={{ backgroundColor: v.bg, paddingHorizontal: s.px, paddingVertical: s.py, borderRadius: tokens.radius.md, opacity: state.isDisabled ? 0.5 : 1 }}>
      {state.isLoading ? <ActivityIndicator color={v.text} /> : (
        <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>{children}</Text>
      )}
    </Pressable>
  );
}
```

**Rule: Variant/size maps use tokens only. No hardcoded colors or spacing.**

---

## Compound Components

```tsx
const CardContext = createContext<{ variant: 'elevated' | 'outlined' } | null>(null);

function CardRoot({ variant = 'elevated', children }: { variant?: 'elevated' | 'outlined'; children: React.ReactNode }) {
  return (
    <CardContext.Provider value={{ variant }}>
      <View style={[styles.card, variant === 'elevated' && styles.elevated]}>{children}</View>
    </CardContext.Provider>
  );
}

// Sub-components: CardHeader, CardTitle, CardContent, CardFooter
export const Card = Object.assign(CardRoot, {
  Header: CardHeader, Title: CardTitle, Content: CardContent, Footer: CardFooter,
});

// Usage
<Card variant="elevated">
  <Card.Header><Card.Title>Welcome</Card.Title></Card.Header>
  <Card.Content><Text>Body</Text></Card.Content>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

**Rule: Use `Object.assign(Root, { Sub })` for compound export. Context shares variant/state across sub-components.**

---

## Variant Props (not booleans)

```tsx
// ❌ <Button primary large outline /> — conflicting states possible
interface BadProps { primary?: boolean; secondary?: boolean; large?: boolean; }

// ✅ <Button variant="outline" colorScheme="primary" size="lg" /> — mutually exclusive
interface GoodProps {
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
```
