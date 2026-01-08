---
name: i18n-patterns
description: Internationalization patterns for web apps. Covers translation structure, next-intl setup, pluralization, date/number formatting, language switcher, and SEO. Use when adding multi-language support to Next.js or React applications.
---

# i18n Patterns

## Quick Reference

| Topic | Library |
|-------|---------|
| Next.js App Router | next-intl |
| React SPA | react-i18next |
| Formatting | Intl API (built-in) |

---

## 1. File Structure

```
locales/
├── en/
│   ├── common.json    # Nav, footer, buttons
│   ├── auth.json      # Login, register
│   ├── errors.json    # Error messages
│   └── [page].json    # Page-specific
├── ko/
└── ja/
```

### Key Naming

```json
// ✅ Good - hierarchical
{
  "nav": { "home": "Home", "products": "Products" },
  "auth": {
    "login": { "title": "Sign In", "submit": "Sign In" }
  },
  "product": { "addToCart": "Add to Cart", "price": "Price: {price}" }
}

// ❌ Bad - flat, unclear
{ "login": "Sign In", "login_btn": "Sign In", "add": "Add" }
```

---

## 2. Next.js App Router (next-intl)

```bash
npm install next-intl
```

### Config

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';
export const locales = ['en', 'ko', 'ja'] as const;
export const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./locales/${locale}.json`)).default,
}));
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({ locales, defaultLocale, localePrefix: 'as-needed' });
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

```javascript
// next.config.js
const withNextIntl = require('next-intl/plugin')('./i18n.ts');
module.exports = withNextIntl({});
```

### Layout

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Usage

```tsx
// Server Component
import { getTranslations } from 'next-intl/server';
export default async function Page() {
  const t = await getTranslations('home');
  return <h1>{t('title')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';
export function Button() {
  const t = useTranslations('product');
  return <button>{t('addToCart')}</button>;
}
```

---

## 3. Interpolation

```json
{ "greeting": "Hello, {name}!", "items": "You have {count} items" }
```

```tsx
t('greeting', { name: 'John' })  // "Hello, John!"
```

### Rich Text

```json
{ "terms": "Agree to our <link>Terms</link>" }
```

```tsx
t.rich('terms', { link: (chunks) => <a href="/terms">{chunks}</a> })
```

---

## 4. Pluralization (ICU Format)

```json
// en
{ "cart.items": "{count, plural, =0 {No items} one {# item} other {# items}}" }
// ko
{ "cart.items": "상품 {count}개" }
```

```tsx
t('cart.items', { count: 0 })  // "No items"
t('cart.items', { count: 1 })  // "1 item"
t('cart.items', { count: 5 })  // "5 items"
```

### Gender

```json
{ "welcome": "{gender, select, male {Mr. {name}} female {Ms. {name}} other {{name}}}" }
```

---

## 5. Date/Number Formatting

```tsx
import { useFormatter } from 'next-intl';

function Display({ date, amount }) {
  const format = useFormatter();
  return (
    <>
      <p>{format.dateTime(date, { dateStyle: 'medium' })}</p>
      <p>{format.relativeTime(date)}</p>  {/* "3 days ago" */}
      <p>{format.number(amount, { style: 'currency', currency: 'USD' })}</p>
      <p>{format.number(0.85, { style: 'percent' })}</p>
    </>
  );
}

// Server: use getFormatter() from 'next-intl/server'
```

---

## 6. Language Switcher

```tsx
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  
  const switchLocale = (newLocale: string) => 
    pathname.replace(`/${locale}`, `/${newLocale}`);

  return (
    <nav>
      {['en', 'ko', 'ja'].map((loc) => (
        <Link key={loc} href={switchLocale(loc)} hrefLang={loc}>
          {loc.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
```

---

## 7. SEO

### Alternate Links

```tsx
// app/[locale]/layout.tsx - generateMetadata
export async function generateMetadata({ params: { locale } }) {
  return {
    alternates: {
      canonical: `https://example.com/${locale}`,
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `https://example.com/${loc}`])
      ),
    },
  };
}
```

### Sitemap

```typescript
// app/sitemap.ts
export default function sitemap() {
  const pages = ['', '/about', '/products'];
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `https://example.com/${locale}${page}`,
      lastModified: new Date(),
    }))
  );
}
```

---

## 8. React SPA (react-i18next)

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    en: { translation: require('./locales/en.json') },
    ko: { translation: require('./locales/ko.json') },
  },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('ko')}>한국어</button>
    </div>
  );
}
```

---

## 9. Common Patterns

### RTL Support

```tsx
const rtlLocales = ['ar', 'he', 'fa'];
<html lang={locale} dir={rtlLocales.includes(locale) ? 'rtl' : 'ltr'}>
```

### Type Safety

```typescript
// types/i18n.d.ts
import en from '../locales/en.json';
declare global {
  interface IntlMessages extends typeof en {}
}
```

### Missing Translation Handler

```typescript
{
  fallbackLng: 'en',
  missingKeyHandler: (lng, ns, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing: ${lng}/${ns}/${key}`);
    }
  },
}
```
