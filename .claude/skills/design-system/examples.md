# Component Patterns

Implementation examples for preferred patterns.

---

## Headless Hook Pattern

Separates behavior from presentation.

### useButton Example

```typescript
// headless/useButton.ts
interface UseButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

interface UseButtonReturn {
  buttonProps: {
    role: string;
    tabIndex: number;
    'aria-disabled': boolean;
    'aria-busy': boolean;
    onClick: () => void;
    onKeyDown: (e: KeyboardEvent) => void;
  };
  state: {
    isDisabled: boolean;
    isLoading: boolean;
  };
}

export function useButton(props: UseButtonProps): UseButtonReturn {
  const { disabled, loading, onPress } = props;
  const isDisabled = disabled || loading;

  return {
    buttonProps: {
      role: 'button',
      tabIndex: isDisabled ? -1 : 0,
      'aria-disabled': isDisabled,
      'aria-busy': loading ?? false,
      onClick: () => {
        if (!isDisabled) onPress?.();
      },
      onKeyDown: (e) => {
        if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onPress?.();
        }
      },
    },
    state: { isDisabled, isLoading: loading ?? false },
  };
}
```

### useToggle Example

```typescript
// headless/useToggle.ts
interface UseToggleProps {
  defaultValue?: boolean;
  value?: boolean;
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
    toggleProps: {
      role: 'switch',
      'aria-checked': isOn,
      onClick: toggle,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      },
    },
    state: { isOn },
    toggle,
  };
}
```

### useDialog Example

```typescript
// headless/useDialog.ts
interface UseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useDialog({ isOpen, onClose }: UseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    
    const focusableElements = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return {
    dialogProps: {
      ref: dialogRef,
      role: 'dialog',
      'aria-modal': true,
    },
    backdropProps: {
      onClick: onClose,
    },
  };
}
```

---

## Styled Component (Using Headless)

```tsx
// styled/Button.tsx
import { useButton } from '../headless/useButton';
import { tokens } from '@/shared/ui/tokens';

const variants = {
  solid: {
    bg: tokens.color.interactive.primary,
    bgHover: tokens.color.interactive.primaryHover,
    text: tokens.color.text.inverse,
  },
  outline: {
    bg: 'transparent',
    bgHover: tokens.color.bg.secondary,
    text: tokens.color.interactive.primary,
    border: tokens.color.interactive.primary,
  },
  ghost: {
    bg: 'transparent',
    bgHover: tokens.color.bg.secondary,
    text: tokens.color.interactive.primary,
  },
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

export function Button({ 
  variant = 'solid', 
  size = 'md', 
  children,
  ...props 
}: ButtonProps) {
  const { buttonProps, state } = useButton(props);
  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable
      {...buttonProps}
      style={({ pressed }) => ({
        backgroundColor: pressed ? v.bgHover : v.bg,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: tokens.radius.md,
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border,
        opacity: state.isDisabled ? 0.5 : 1,
      })}
    >
      {state.isLoading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
```

---

## Compound Components Pattern

### Card Example

```tsx
// Compound component with context
const CardContext = createContext<{ variant: 'elevated' | 'outlined' } | null>(null);

function CardRoot({ 
  variant = 'elevated', 
  children 
}: { 
  variant?: 'elevated' | 'outlined';
  children: React.ReactNode;
}) {
  return (
    <CardContext.Provider value={{ variant }}>
      <View style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
      ]}>
        {children}
      </View>
    </CardContext.Provider>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

// Export as compound
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Content: CardContent,
  Footer: CardFooter,
});

// Usage
<Card variant="elevated">
  <Card.Header>
    <Card.Title>Welcome</Card.Title>
  </Card.Header>
  <Card.Content>
    <Text>Card body content here</Text>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

---

## Polymorphic `as` Prop Pattern

```tsx
// primitives/Box.tsx
type BoxProps<T extends ElementType = 'div'> = {
  as?: T;
  p?: keyof typeof tokens.spacing.component;
  m?: keyof typeof tokens.spacing.component;
  bg?: keyof typeof tokens.color.bg;
  children: React.ReactNode;
} & ComponentPropsWithoutRef<T>;

export function Box<T extends ElementType = 'div'>({ 
  as,
  p,
  m,
  bg,
  style,
  children,
  ...props 
}: BoxProps<T>) {
  const Component = as || 'div';
  
  return (
    <Component
      style={{
        padding: p ? tokens.spacing.component[p] : undefined,
        margin: m ? tokens.spacing.component[m] : undefined,
        backgroundColor: bg ? tokens.color.bg[bg] : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

// Usage
<Box as="section" p="lg" bg="secondary">
  Content
</Box>

<Box as="article" m="md">
  Article content
</Box>
```

---

## Variant Props Pattern

```tsx
// ❌ Avoid: Boolean props
interface BadButtonProps {
  primary?: boolean;
  secondary?: boolean;
  large?: boolean;
  small?: boolean;
  outline?: boolean;
}
// Problem: <Button primary large outline /> - conflicting states possible

// ✅ Prefer: Variant props
interface GoodButtonProps {
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
// Clear: <Button variant="outline" colorScheme="primary" size="lg" />
```
