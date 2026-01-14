---
name: i18n-patterns
description: |
  Internationalization patterns for web and mobile apps.
  Use when: adding multi-language support, translation structure, language switching.
  Do not use for: general React/Next.js patterns (use nextjs, expo-react-native skills).
  Workflow: Use alongside nextjs or expo-react-native skill.
---

# i18n Patterns

**For latest APIs, use context7 MCP server with library-id `i18next/react-i18next` or `amannn/next-intl`.**

| Platform | Library |
|----------|---------|
| React / React Native | react-i18next |
| Next.js App Router | next-intl |

---

## File Structure

```
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── errors.json
└── ko/
    ├── common.json
    ├── auth.json
    └── errors.json
```

**Rule: Split by domain, not by page. One namespace per feature.**

```json
// ✅ Good - hierarchical by feature
{
  "login": { "title": "Sign In", "submit": "Sign In" },
  "register": { "title": "Sign Up", "submit": "Create Account" }
}

// ❌ Bad - flat
{
  "loginTitle": "Sign In",
  "loginSubmit": "Sign In"
}
```

---

## Type-Safe Translations

```typescript
// types/i18n.ts
export interface AuthTranslations {
  login: { title: string; submit: string };
  register: { title: string; submit: string };
}

// Nested key path utility
type KeyPath<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object ? `${K}.${KeyPath<T[K]>}` : K
      : never
    }[keyof T]
  : never;

export type AuthKeys = KeyPath<AuthTranslations>;
// Result: "login.title" | "login.submit" | "register.title" | "register.submit"
```

---

## Domain-Specific Hooks

**Rule: Create typed hooks per domain. Don't use raw `t()` everywhere.**

```typescript
// hooks/useAuthI18n.ts
export const useAuthI18n = () => {
  const { t } = useTranslation('auth');
  
  return useMemo(() => ({
    login: {
      title: t('login.title'),
      submit: t('login.submit'),
    },
    register: {
      title: t('register.title'),
      submit: t('register.submit'),
    },
  }), [t]);
};

// Usage - clean and typed
function LoginForm() {
  const { login } = useAuthI18n();
  return <h1>{login.title}</h1>;
}
```

---

## Formatting Hook

```typescript
// hooks/useFormat.ts
export const useFormat = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return useMemo(() => ({
    number: (v: number) => 
      new Intl.NumberFormat(lang).format(v),
    
    currency: (v: number, currency = 'USD') =>
      new Intl.NumberFormat(lang, { style: 'currency', currency }).format(v),
    
    date: (d: Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(lang, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        ...options 
      }).format(d),
    
    relativeTime: (d: Date) => {
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
      if (diff < 60) return rtf.format(-diff, 'second');
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
      if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
      return rtf.format(-Math.floor(diff / 86400), 'day');
    },
  }), [lang]);
};
```

---

## Pluralization

```json
// en/common.json
{
  "items_zero": "No items",
  "items_one": "{{count}} item",
  "items_other": "{{count}} items"
}
```

```tsx
t('items', { count: 0 })  // "No items"
t('items', { count: 1 })  // "1 item"
t('items', { count: 5 })  // "5 items"
```

---

## Language Config

```typescript
// config/languages.ts
export const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const isRTL = (code: string) =>
  LANGUAGES.find(l => l.code === code)?.dir === 'rtl';
```

---

## Next.js App Router (next-intl)

**For setup and configuration, see [next-intl docs](https://next-intl-docs.vercel.app/docs/getting-started/app-router).**

**Pattern:**

```tsx
// Server Component
const t = await getTranslations('namespace');

// Client Component  
const t = useTranslations('namespace');
```

**Rule: Use `getTranslations` in Server Components, `useTranslations` in Client Components.**

---

## Quick Checklist

- [ ] Translations split by domain (auth, common, errors)
- [ ] Type-safe keys with KeyPath utility
- [ ] Domain-specific hooks (useAuthI18n, useCommonI18n)
- [ ] Using Intl APIs for formatting (not moment/dayjs for dates)
- [ ] Pluralization rules defined (_zero, _one, _other)
- [ ] RTL support if needed
