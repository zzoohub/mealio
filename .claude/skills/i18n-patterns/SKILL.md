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

**Rule: Split by domain, not by page. One namespace per feature. Use hierarchical keys.**

```json
// ✅ Good                              // ❌ Bad - flat
{                                        { "loginTitle": "Sign In",
  "login": { "title": "Sign In" },        "loginSubmit": "Sign In" }
  "register": { "title": "Sign Up" }
}
```

---

## i18next Init

**Rule: Never use `interpolation.format` — legacy since i18next >= 21.3.0 (triggers deprecation warning).**

```typescript
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

i18next.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // ❌ Do NOT set `format` here
});

// ✅ Modern custom formatters — register after init
i18next.services.formatter?.add('uppercase', (value: string) => value.toUpperCase());
```

```json
{ "greeting": "Hello, {{name, uppercase}}!" }
```

---

## Built-in Intl Formatters (i18next >= 21.3.0)

No custom code needed. Use directly in translation strings:

```json
{
  "visitors": "Total: {{val, number}}",
  "precise": "Score: {{val, number(minimumFractionDigits: 2)}}",
  "price": "Price: {{val, currency(USD)}}",
  "createdAt": "Created: {{val, datetime}}",
  "createdFull": "Created: {{val, datetime(dateStyle: full)}}",
  "lastSeen": "Active {{val, relativetime}}"
}
```

Per-value options via `formatParams`:

```tsx
t('createdAt', {
  val: new Date(),
  formatParams: { val: { weekday: 'long', month: 'long', day: 'numeric' } }
})
```

---

## Pluralization (JSON v4 — i18next >= 21)

Uses `Intl.PluralRules` suffixes: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`. **Variable must be `count`.**

```json
{
  "items_zero": "No items",
  "items_one": "{{count}} item",
  "items_other": "{{count}} items",
  "place_ordinal_one": "{{count}}st",
  "place_ordinal_two": "{{count}}nd",
  "place_ordinal_few": "{{count}}rd",
  "place_ordinal_other": "{{count}}th"
}
```

```tsx
t('items', { count: 0 })                  // "No items"
t('items', { count: 5 })                  // "5 items"
t('place', { count: 1, ordinal: true })   // "1st"
```

---

## Type-Safe Keys

```typescript
type KeyPath<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object ? `${K}.${KeyPath<T[K]>}` : K
      : never }[keyof T]
  : never;

// KeyPath<{ login: { title: string } }> → "login.title"
```

---

## Domain-Specific Hooks

**Rule: Create typed hooks per domain. Don't use raw `t()` everywhere.**

```typescript
export const useAuthI18n = () => {
  const { t } = useTranslation('auth');
  return useMemo(() => ({
    login: { title: t('login.title'), submit: t('login.submit') },
    register: { title: t('register.title'), submit: t('register.submit') },
  }), [t]);
};

// Usage
const { login } = useAuthI18n();
return <h1>{login.title}</h1>;
```

---

## Formatting Hook (standalone use outside translation strings)

For formatting inside translation strings, prefer built-in Intl formatters above.

```typescript
export const useFormat = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(() => ({
    number: (v: number) => new Intl.NumberFormat(lang).format(v),
    currency: (v: number, cur = 'USD') =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: cur }).format(v),
    date: (d: Date, opts?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric', ...opts }).format(d),
    relativeTime: (d: Date) => {
      const s = Math.floor((Date.now() - d.getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
      if (s < 60) return rtf.format(-s, 'second');
      if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute');
      if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour');
      return rtf.format(-Math.floor(s / 86400), 'day');
    },
  }), [lang]);
};
```

---

## Language Config

```typescript
export const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const isRTL = (code: string) => LANGUAGES.find(l => l.code === code)?.dir === 'rtl';
```

---

## Next.js App Router (next-intl)

**Docs: [next-intl.dev/docs/getting-started/app-router](https://next-intl.dev/docs/getting-started/app-router)**

### Translation

```tsx
// Server Component — use getTranslations from 'next-intl/server'
import { getTranslations } from 'next-intl/server';
export default async function Page() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('title')}</h1>;
}

// Client Component — use useTranslations from 'next-intl'
'use client';
import { useTranslations } from 'next-intl';
export default function Card() {
  const t = useTranslations('Dashboard');
  return <p>{t('subtitle')}</p>;
}
```

### Formatting & Plurals (ICU syntax)

```tsx
import { useFormatter } from 'next-intl';
const format = useFormatter();
format.number(29.99, { style: 'currency', currency: 'USD' });  // "$29.99"
format.dateTime(date, 'medium');                                 // "Feb 3, 2026"
format.relativeTime(pastDate);                                   // "2 hours ago"
```

```json
{ "followers": "{count, plural, =0 {No followers} =1 {One follower} other {# followers}}" }
```

### Static Rendering

```tsx
import { setRequestLocale } from 'next-intl/server';
export default function Page({ params }) {
  const { locale } = use(params);
  setRequestLocale(locale);  // Call before useTranslations
  const t = useTranslations('Page');
}
```

---

## Checklist

- [ ] Translations split by domain (auth, common, errors)
- [ ] Type-safe keys with KeyPath utility
- [ ] Domain-specific hooks (useAuthI18n, useCommonI18n)
- [ ] **No legacy `interpolation.format`** — use built-in Intl formatters or `services.formatter.add()`
- [ ] Built-in formatters in translation strings (`{{val, number}}`, `{{val, currency(USD)}}`, `{{val, datetime}}`)
- [ ] Pluralization: JSON v4 suffixes (`_one`, `_other`) for i18next; ICU syntax for next-intl
- [ ] RTL support if needed
