---
name: react-patterns
description: React component patterns for scalable UI. Covers custom hooks, compound components, render props, HOCs, composition, and controlled components. Use when designing component APIs, sharing logic, or building component libraries.
---

# React Component Patterns

## Quick Reference

| Pattern | Use Case | Modern? |
|---------|----------|---------|
| Custom Hooks | Reusable stateful logic | ✅ Preferred |
| Compound Components | Multi-part components (Tabs, Menu) | ✅ |
| Composition | Flexible, declarative APIs | ✅ |
| Render Props | Share logic, flexible rendering | ⚠️ Use hooks |
| HOC | Cross-cutting concerns | ⚠️ Use hooks |

---

## 1. Custom Hooks (Preferred)

Extract and share stateful logic.

```jsx
// useLocalStorage
const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initial;
  });
  
  const set = (v) => {
    const val = v instanceof Function ? v(value) : v;
    setValue(val);
    localStorage.setItem(key, JSON.stringify(val));
  };
  
  return [value, set];
};

// useFetch
const useFetch = (url) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
    return () => ctrl.abort();
  }, [url]);
  
  return state;
};

// useDebounce
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
```

---

## 2. Compound Components

Components that work together, sharing implicit state.

```jsx
const TabContext = createContext();

const Tabs = ({ children, defaultIndex = 0 }) => {
  const [active, setActive] = useState(defaultIndex);
  return (
    <TabContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabContext.Provider>
  );
};

const Tab = ({ children, index }) => {
  const { active, setActive } = useContext(TabContext);
  return (
    <button 
      className={active === index ? 'active' : ''} 
      onClick={() => setActive(index)}
    >
      {children}
    </button>
  );
};

const TabPanel = ({ children, index }) => {
  const { active } = useContext(TabContext);
  return active === index ? <div>{children}</div> : null;
};

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

**Use for**: Tabs, Accordion, Select, Menu, Modal.

---

## 3. Composition Pattern

Build complex UIs from simple pieces.

```jsx
const Card = ({ children, className = '' }) => (
  <div className={`card ${className}`}>{children}</div>
);
Card.Header = ({ children }) => <div className="card-header">{children}</div>;
Card.Content = ({ children }) => <div className="card-content">{children}</div>;
Card.Footer = ({ children }) => <div className="card-footer">{children}</div>;

// Usage
<Card>
  <Card.Header><h3>{title}</h3></Card.Header>
  <Card.Content>{description}</Card.Content>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

---

## 4. Controlled vs Uncontrolled

```jsx
// Controlled - React manages state
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// Uncontrolled - DOM manages state
const ref = useRef();
<input ref={ref} defaultValue="initial" />
const getValue = () => ref.current.value;

// Hybrid - supports both
const Input = ({ value: controlled, defaultValue, onChange, ...props }) => {
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
};
```

---

## 5. Render Props

Share logic with flexible rendering. (Prefer hooks for new code)

```jsx
const Toggle = ({ children, initial = false }) => {
  const [on, setOn] = useState(initial);
  return children({ on, toggle: () => setOn(p => !p) });
};

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

```jsx
const withAuth = (Component) => (props) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  return <Component {...props} user={user} />;
};

export default withAuth(Dashboard);
```

**Caveats**: Wrapper hell, refs don't pass through (use forwardRef).

---

## 7. Props Getters

Return props for elements (great for a11y).

```jsx
const useDropdown = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getToggleProps = (props = {}) => ({
    'aria-expanded': isOpen,
    onClick: () => setIsOpen(!isOpen),
    ...props,
  });
  
  const getItemProps = ({ item, ...props } = {}) => ({
    role: 'option',
    onClick: () => { onSelect(item); setIsOpen(false); },
    ...props,
  });
  
  return { isOpen, getToggleProps, getItemProps };
};

// Usage
const { isOpen, getToggleProps, getItemProps } = useDropdown({ onSelect });
<button {...getToggleProps()}>Menu</button>
{isOpen && items.map(item => (
  <div {...getItemProps({ item })}>{item.label}</div>
))}
```

---

## 8. Container/Presentational

Separate data from UI. (Modern: just use hooks)

```jsx
// Hook extracts logic
const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);
  return { users, loading };
};

// Component uses hook
const UserList = () => {
  const { users, loading } = useUsers();
  if (loading) return <Spinner />;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```

---

## Best Practices

1. **Prefer Hooks** over HOCs and render props
2. **Single Responsibility** - one component, one job
3. **Composition over Configuration** - small composable pieces
4. **Lift State Up** to nearest common ancestor
5. **Consistent Props** - use conventions (onChange, onSubmit)
