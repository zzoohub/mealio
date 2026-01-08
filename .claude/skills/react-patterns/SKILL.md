---
name: react-patterns
description: React component patterns for scalable UI. Covers custom hooks, compound components, render props, HOCs, composition, and controlled components. Use when designing component APIs or sharing logic.
---

# React Component Patterns

## Quick Reference

| Pattern | Use Case | Recommended |
|---------|----------|-------------|
| Custom Hooks | Reusable stateful logic | ✅ Preferred |
| Compound Components | Multi-part components | ✅ |
| Composition | Flexible, declarative APIs | ✅ |
| Render Props | Share logic, flexible rendering | ⚠️ Use hooks |
| HOC | Cross-cutting concerns | ⚠️ Use hooks |

---

## 1. Custom Hooks (Preferred)

Extract and share stateful logic.

```tsx
// useLocalStorage
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initial;
  });
  
  const set = (v: T | ((prev: T) => T)) => {
    const val = v instanceof Function ? v(value) : v;
    setValue(val);
    localStorage.setItem(key, JSON.stringify(val));
  };
  
  return [value, set] as const;
}

// useDebounce
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debounced;
}

// useMediaQuery
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
}
```

---

## 2. Compound Components

Components that work together, sharing implicit state.

```tsx
const TabContext = createContext<{
  active: number;
  setActive: (i: number) => void;
} | null>(null);

function Tabs({ children, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <TabContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabContext.Provider>
  );
}

function Tab({ children, index }: { children: ReactNode; index: number }) {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('Tab must be within Tabs');
  
  return (
    <button 
      className={ctx.active === index ? 'active' : ''} 
      onClick={() => ctx.setActive(index)}
    >
      {children}
    </button>
  );
}

function TabPanel({ children, index }: { children: ReactNode; index: number }) {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('TabPanel must be within Tabs');
  
  return ctx.active === index ? <div>{children}</div> : null;
}

Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs defaultIndex={0}>
  <Tabs.Tab index={0}>Profile</Tabs.Tab>
  <Tabs.Tab index={1}>Settings</Tabs.Tab>
  <Tabs.Panel index={0}><Profile /></Tabs.Panel>
  <Tabs.Panel index={1}><Settings /></Tabs.Panel>
</Tabs>
```

**Use for**: Tabs, Accordion, Select, Menu, Modal, Card.

---

## 3. Composition Pattern

Build complex UIs from simple pieces.

```tsx
function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

Card.Header = ({ children }) => (
  <div className="card-header">{children}</div>
);

Card.Content = ({ children }) => (
  <div className="card-content">{children}</div>
);

Card.Footer = ({ children }) => (
  <div className="card-footer">{children}</div>
);

// Usage
<Card>
  <Card.Header><h3>{title}</h3></Card.Header>
  <Card.Content>{description}</Card.Content>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

---

## 4. Controlled vs Uncontrolled

```tsx
// Controlled - React manages state
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// Uncontrolled - DOM manages state
const ref = useRef<HTMLInputElement>(null);
<input ref={ref} defaultValue="initial" />

// Hybrid - supports both
interface InputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

function Input({ value: controlled, defaultValue, onChange, ...props }: InputProps) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = controlled !== undefined;
  
  return (
    <input
      value={isControlled ? controlled : internal}
      onChange={e => {
        if (!isControlled) setInternal(e.target.value);
        onChange?.(e);
      }}
      {...props}
    />
  );
}
```

---

## 5. Render Props

Share logic with flexible rendering. (Prefer hooks for new code)

```tsx
interface ToggleRenderProps {
  on: boolean;
  toggle: () => void;
}

function Toggle({ 
  children, 
  initial = false 
}: { 
  children: (props: ToggleRenderProps) => ReactNode;
  initial?: boolean;
}) {
  const [on, setOn] = useState(initial);
  return <>{children({ on, toggle: () => setOn(p => !p) })}</>;
}

// Usage
<Toggle>
  {({ on, toggle }) => (
    <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>
  )}
</Toggle>
```

---

## 6. Higher-Order Components (HOC)

Wrap components to add functionality. (Prefer hooks for new code)

```tsx
function withAuth<P extends object>(Component: ComponentType<P & { user: User }>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    
    return <Component {...props} user={user} />;
  };
}

// Usage
const ProtectedDashboard = withAuth(Dashboard);
```

---

## 7. Props Getters

Return props for elements (accessibility pattern).

```tsx
function useDropdown<T>({ onSelect }: { onSelect: (item: T) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getToggleProps = () => ({
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox' as const,
    onClick: () => setIsOpen(!isOpen),
  });
  
  const getItemProps = (item: T) => ({
    role: 'option' as const,
    onClick: () => {
      onSelect(item);
      setIsOpen(false);
    },
  });
  
  return { isOpen, getToggleProps, getItemProps };
}

// Usage
const { isOpen, getToggleProps, getItemProps } = useDropdown({ onSelect });

<button {...getToggleProps()}>Menu</button>
{isOpen && items.map(item => (
  <div key={item.id} {...getItemProps(item)}>{item.label}</div>
))}
```

---

## 8. Slot Pattern

Allow customization of specific parts.

```tsx
interface DialogProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
}

function Dialog({ children, title, footer }: DialogProps) {
  return (
    <div className="dialog">
      {title && <div className="dialog-title">{title}</div>}
      <div className="dialog-content">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </div>
  );
}

// Usage
<Dialog
  title={<h2>Confirm Action</h2>}
  footer={
    <>
      <Button variant="ghost">Cancel</Button>
      <Button>Confirm</Button>
    </>
  }
>
  Are you sure you want to proceed?
</Dialog>
```

---

## 9. Performance

For memoization patterns (`memo`, `useCallback`, `useMemo`), see **performance-patterns** skill.

Key principles:
- Memoize components receiving callbacks as props
- Memoize expensive computations
- Use `memo` for components that render often with same props

---

## Best Practices

1. **Prefer Hooks** over HOCs and render props
2. **Single Responsibility** - one component, one job
3. **Composition over Configuration** - small composable pieces
4. **Lift State Up** to nearest common ancestor
5. **Consistent Props** - use conventions (onChange, onSubmit, onClose)
6. **TypeScript** - always type props and return values
7. **Context for Compound Components** - not for global state (use Zustand)
