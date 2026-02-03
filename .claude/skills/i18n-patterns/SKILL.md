---
name: i18n-patterns
description: |
  Internationalization patterns for web and mobile apps.
  Use when: adding multi-language support, translation structure, language switching.
  Do not use for: general React/Next.js patterns (use nextjs, react-native skills).
  Workflow: Use alongside nextjs or react-native skill.
---

# i18n Patterns

**For latest APIs, use context7.**

| Platform | Library |
|----------|---------|
| React / React Native | react-i18next (v16+) + i18next (v25+) |
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

## i18next Init (React / React Native)

**Rule: Never use `interpolation.format` — it is legacy since i18next >= 21.3.0 and triggers a deprecation warning.**

```typescript
// i18n.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

i18next
  .use(initReactI18next)
  .init({
    resources: { /* or use i18next-http-backend */ },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
      // ❌ Do NOT set `format` here — this is the legacy API
    },
  });

export default i18next;
```

### Custom Formatters (Modern API)

Register custom formatters via `i18next.services.formatter.add()` **after** init:

```typescript
// i18n.ts (continued, after init)
i18next.services.formatter?.add('uppercase', (value: string) => {
  return value.toUpperCase();
});

i18next.services.formatter?.add('lowercase', (value: string) => {
  return value.toLocaleLowerCase();
});
```

```json
// en/common.json
{
  "greeting": "Hello, {{name, uppercase}}!"
}
```

```tsx
t('greeting', { name: 'claude' })  // "Hello, CLAUDE!"
```

---

## Built-in Intl Formatters (i18next >= 21.3.0)

i18next ships with built-in formatters powered by the Intl API. Use these directly in translation strings — no custom code needed for common formatting.

### Number

```json
{
  "visitors": "Total: {{val, number}}",
  "precise": "Score: {{val, number(minimumFractionDigits: 2)}}"
}
```

```tsx
t('visitors', { val: 1000 })    // "Total: 1,000"
t('precise', { val: 99.5 })     // "Score: 99.50"
```

### Currency

```json
{
  "price": "Price: {{val, currency(USD)}}",
  "priceExplicit": "Price: {{val, currency(currency: EUR)}}"
}
```

```tsx
t('price', { val: 29.99 })  // "Price: $29.99"
```

### DateTime

```json
{
  "createdAt": "Created: {{val, datetime}}",
  "createdAtFull": "Created: {{val, datetime(dateStyle: full)}}"
}
```

```tsx
t('createdAt', { val: new Date() })  // "Created: 2/3/2026"
```

### Relative Time

```json
{
  "lastSeen": "Last active {{val, relativetime}}",
  "quarterly": "{{val, relativetime(quarter)}}"
}
```

```tsx
t('lastSeen', { val: -3 })  // "Last active 3 days ago"
```

### Per-value Format Options

Use `formatParams` to pass Intl options per variable:

```tsx
t('createdAt', {
  val: new Date(),
  formatParams: {
    val: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  }
})
// "Created: Tuesday, February 3, 2026"
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

## Formatting Hook (for standalone use outside translation strings)

Use this hook when formatting values **outside** of translation strings (e.g. table cells, labels).
For formatting **inside** translation strings, prefer the built-in Intl formatters above.

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

## Pluralization (JSON v4 format — i18next >= 21)

Uses Intl.PluralRules suffixes: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.

**Rule: The variable must be named `count`.**

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

### Ordinals

```json
{
  "place_ordinal_one": "{{count}}st place",
  "place_ordinal_two": "{{count}}nd place",
  "place_ordinal_few": "{{count}}rd place",
  "place_ordinal_other": "{{count}}th place"
}
```

```tsx
t('place', { count: 1, ordinal: true })   // "1st place"
t('place', { count: 2, ordinal: true })   // "2nd place"
t('place', { count: 11, ordinal: true })  // "11th place"
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

**For setup and configuration, see [next-intl docs](https://next-intl.dev/docs/getting-started/app-router).**

### Translation

```tsx
// Async Server Component
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('title')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export default function Card() {
  const t = useTranslations('Dashboard');
  return <p>{t('subtitle')}</p>;
}
```

**Rule: Use `getTranslations` (from `next-intl/server`) in async Server Components, `useTranslations` in Client Components.**

### Formatting (next-intl)

next-intl provides its own `useFormatter` hook (separate from i18next):

```tsx
import { useFormatter } from 'next-intl';

function PriceTag({ amount }: { amount: number }) {
  const format = useFormatter();
  
  return (
    <span>
      {format.number(amount, { style: 'currency', currency: 'USD' })}
    </span>
  );
  // Renders "$29.99"
}
```

```tsx
const format = useFormatter();

format.dateTime(date, { year: 'numeric', month: 'short', day: 'numeric' });
// "Feb 3, 2026"

format.dateTime(date, 'medium');
// Uses predefined format: full, long, medium, short

format.relativeTime(pastDate);
// "2 hours ago"
```

### Pluralization (next-intl uses ICU syntax)

```json
{
  "followers": "{count, plural, =0 {No followers yet} =1 {One follower} other {# followers}}"
}
```

```tsx
t('followers', { count: 0 })     // "No followers yet"
t('followers', { count: 1 })     // "One follower"
t('followers', { count: 1000 })  // "1,000 followers"
```

### Static Rendering

```tsx
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';

export default function Page({ params }) {
  const { locale } = use(params);
  setRequestLocale(locale);  // Must be called before useTranslations
  
  const t = useTranslations('Page');
  return <h1>{t('title')}</h1>;
}
```

---

## Quick Checklist

- [ ] Translations split by domain (auth, common, errors)
- [ ] Type-safe keys with KeyPath utility
- [ ] Domain-specific hooks (useAuthI18n, useCommonI18n)
- [ ] **No legacy `interpolation.format` in i18next init** — use built-in Intl formatters or `services.formatter.add()`
- [ ] Using built-in Intl formatters in translation strings (`{{val, number}}`, `{{val, currency(USD)}}`, `{{val, datetime}}`)
- [ ] Pluralization with JSON v4 suffixes (`_one`, `_other`) for i18next; ICU syntax for next-intl
- [ ] RTL support if needed
