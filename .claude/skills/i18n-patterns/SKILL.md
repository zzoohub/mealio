---
name: i18n-patterns
description: Internationalization patterns for web and mobile apps. Covers type-safe translation structure, domain-specific hooks, pluralization, date/number formatting, and language switching. Use when adding multi-language support to Next.js, React, or React Native applications.
---

# i18n Patterns

| Platform | Library |
|----------|---------|
| React / React Native | react-i18next |
| Next.js App Router | next-intl |

---

# Part 1: Common Patterns

## 1. File Structure

```
locales/modules/
├── common.en.json
├── common.ko.json
├── auth.en.json
└── auth.ko.json
```

```json
// ✅ Good - hierarchical
{
  "login": { "title": "Sign In", "submit": "Sign In" },
  "welcome": { "title": "Welcome", "message": "Get started" }
}
```

---

## 2. Type-Safe Translations

```typescript
// types/i18n.ts
export interface TranslationResources {
  common: CommonTranslations;
  auth: AuthTranslations;
  errors: ErrorTranslations;
}

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
```

---

## 3. Domain-Specific Hooks

```typescript
// hooks/useI18n.ts
export const useI18n = <T extends string = string>(ns?: string) => {
  const { t, i18n, ready } = useTranslation(ns);
  const lang = i18n.language;

  const format = useMemo(() => ({
    number: (v: number) => new Intl.NumberFormat(lang).format(v),
    currency: (v: number, cur = 'USD') =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: cur }).format(v),
    date: (d: Date, opt?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric', ...opt }).format(d),
    relativeTime: (d: Date) => {
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
      if (diff < 60) return rtf.format(-diff, 'second');
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
      if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
      return rtf.format(-Math.floor(diff / 86400), 'day');
    },
  }), [lang]);

  return { t: (key: T, opt?: any) => t(key, opt) as string, i18n, ready, language: lang, format };
};

// hooks/useAuthI18n.ts
export const useAuthI18n = () => {
  const { t, format } = useI18n<AuthKeys>('auth');
  return useMemo(() => ({
    login: { title: t('login.title'), submit: t('login.submit') },
    register: { title: t('register.title'), submit: t('register.submit') },
    formatDate: format.date,
  }), [t, format.date]);
};
```

```tsx
// Usage
function LoginForm() {
  const auth = useAuthI18n();
  return <h1>{auth.login.title}</h1>;
}
```

---

## 4. Pluralization

```json
// common.en.json
{ "items_zero": "No items", "items_one": "{{count}} item", "items_other": "{{count}} items" }
```

```tsx
t('items', { count: 5 })  // "5 items"
```

---

## 5. Language Configuration

```typescript
// config/languages.ts
export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English', direction: 'ltr', currency: 'USD' },
  { code: 'ko', nativeName: '한국어', direction: 'ltr', currency: 'KRW' },
  { code: 'ar', nativeName: 'العربية', direction: 'rtl', currency: 'SAR' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export const isRTL = (code: string) =>
  SUPPORTED_LANGUAGES.find(l => l.code === code)?.direction === 'rtl';
```

---

# Part 2: React / React Native

```bash
# Web
npm install i18next react-i18next i18next-browser-languagedetector
# React Native
npm install i18next react-i18next expo-localization
```

```typescript
// lib/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Web: import LanguageDetector from 'i18next-browser-languagedetector';
// RN:  import * as Localization from 'expo-localization';

const loadTranslations = async (lang: string) => ({
  common: (await import(`./locales/modules/common.${lang}.json`)).default,
  auth: (await import(`./locales/modules/auth.${lang}.json`)).default,
});

export const initializeI18n = async () => {
  const [en, ko] = await Promise.all([loadTranslations('en'), loadTranslations('ko')]);

  await i18n.use(initReactI18next).init({
    resources: { en, ko },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
};

export const changeLanguage = async (lang: SupportedLanguage) => {
  const translations = await loadTranslations(lang);
  Object.entries(translations).forEach(([ns, res]) => {
    if (!i18n.hasResourceBundle(lang, ns)) i18n.addResourceBundle(lang, ns, res);
  });
  await i18n.changeLanguage(lang);
};
```

---

# Part 3: Next.js App Router

```bash
npm install next-intl
```

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';
export const locales = ['en', 'ko'] as const;

export default getRequestConfig(async ({ locale }) => ({
  messages: {
    common: (await import(`./locales/modules/common.${locale}.json`)).default,
    auth: (await import(`./locales/modules/auth.${locale}.json`)).default,
  },
}));
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
export default createMiddleware({ locales: ['en', 'ko'], defaultLocale: 'en', localePrefix: 'as-needed' });
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

```tsx
// Server Component
const t = await getTranslations('auth');
return <h1>{t('login.title')}</h1>;

// Client Component
const t = useTranslations('auth');
return <button>{t('login.submit')}</button>;
```

```tsx
// SEO - generateMetadata
export async function generateMetadata({ params: { locale } }) {
  return {
    alternates: {
      languages: Object.fromEntries(locales.map(l => [l, `https://example.com/${l}`])),
    },
  };
}
```
