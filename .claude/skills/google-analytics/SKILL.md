---
name: google-analytics
description: |
  GA4 event tracking patterns and taxonomy.
  Use when: implementing analytics, tracking user events, e-commerce tracking.
  Do not use for: general performance optimization (use performance-patterns skill).
  Workflow: Set up after core features are built.
---

# Google Analytics (GA4)

**For Nextjs with GA4, see [NextjsGA4 docs](https://nextjs.org/docs/messages/next-script-for-ga).**

---

## Setup

**For setup instructions:**
- Next.js: See [@next/third-parties docs](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries#google-analytics)
- ExpoReact Native: See [@expo/react-native-google-analytics](https://docs.expo.dev/guides/using-analytics/)

---

## Event Naming

**Rule: Use snake_case for all event names and parameters.**

```typescript
// ✅ Good
{ event: 'add_to_cart', item_id: 'SKU123' }

// ❌ Bad  
{ event: 'AddToCart', itemId: 'SKU123' }
```

---

## Event Taxonomy

Wrap analytics calls in a centralized module:

```typescript
// lib/analytics.ts
export const Analytics = {
  // Auth
  signUp: (method: string) => track('sign_up', { method }),
  login: (method: string) => track('login', { method }),

  // E-commerce
  viewItem: (item: Item) => track('view_item', {
    currency: 'USD',
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  }),
  
  addToCart: (item: Item, quantity: number) => track('add_to_cart', {
    currency: 'USD',
    value: item.price * quantity,
    items: [{ item_id: item.id, item_name: item.name, quantity }],
  }),
  
  purchase: (txId: string, value: number, items: Item[]) => track('purchase', {
    transaction_id: txId,
    value,
    currency: 'USD',
    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price })),
  }),

  // Engagement
  search: (term: string) => track('search', { search_term: term }),
};
```

**Rule: Never call tracking functions directly in components. Use centralized Analytics object.**

---

## E-commerce Flow

Standard GA4 e-commerce funnel:

```
view_item → add_to_cart → begin_checkout → purchase
```

**Rule: Mark conversions in GA4 Admin → Events → Toggle "Mark as conversion"**

---

## User Tracking

| Action | Event/Config |
|--------|--------------|
| Set user ID | `config` with `user_id` after login |
| User properties | `set` with `user_properties` |

---

## Consent Mode (GDPR)

| State | Action |
|-------|--------|
| Before consent | `consent: 'default'` with `analytics_storage: 'denied'` |
| After consent | `consent: 'update'` with `analytics_storage: 'granted'` |

---

## Quick Checklist

- [ ] GA4 measurement ID configured
- [ ] Events use snake_case naming
- [ ] Centralized Analytics module (not scattered tracking calls)
- [ ] Conversions marked in GA4 Admin
- [ ] E-commerce events follow standard schema
- [ ] Consent mode implemented (if GDPR applies)
