---
name: google-analytics
description: GA4 analytics for Next.js, React, and React Native (Firebase). Covers setup, page views, custom events, e-commerce tracking, and event design. Use when implementing user behavior analytics.
---

# Analytics with GA4

## Quick Reference

| Platform | Library | Page Views |
|----------|---------|------------|
| Next.js | @next/third-parties | Auto |
| React | react-ga4 | Manual (router) |
| React Native | @react-native-firebase/analytics | Manual |

---

## What to Track (Minimum Funnel)

```
[Landing] → [Key Page] → [Pre-conversion] → [Conversion]
```

| Business | Pre-conversion | Conversion |
|----------|----------------|------------|
| SaaS | `click_signup`, `start_trial` | `sign_up`, `purchase` |
| E-commerce | `add_to_cart`, `begin_checkout` | `purchase` |
| Content | `click_subscribe` | `subscribe` |

**Mark conversions**: GA4 Admin → Events → Toggle "Mark as conversion"

---

## Next.js Setup

```bash
npm install @next/third-parties
```

```tsx
// app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      )}
    </html>
  );
}
```

```tsx
// Event tracking
"use client";
import { sendGAEvent } from "@next/third-parties/google";

<button onClick={() => sendGAEvent("event", "sign_up", { method: "email" })}>
  Sign Up
</button>
```

**GTM alternative:**
```tsx
import { GoogleTagManager } from "@next/third-parties/google";
<GoogleTagManager gtmId="GTM-XXXXXXX" />
```

---

## React Setup

```bash
npm install react-ga4
```

```tsx
// main.tsx
import ReactGA from "react-ga4";
ReactGA.initialize("G-XXXXXXXXXX");

// Page tracking with router
import { useLocation } from "react-router-dom";
function usePageTracking() {
  const location = useLocation();
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location]);
}

// Event
ReactGA.event("sign_up", { method: "email" });
```

---

## React Native Setup (Firebase)

```bash
yarn add @react-native-firebase/app @react-native-firebase/analytics
cd ios && pod install
```

```typescript
import analytics from "@react-native-firebase/analytics";

// Screen view
await analytics().logScreenView({ screen_name: "HomeScreen" });

// Events
await analytics().logSignUp({ method: "email" });
await analytics().logEvent("add_to_cart", { item_id: "SKU123", price: 29.99 });
```

**GDPR (disable auto-collection):**
```json
// firebase.json
{ "react-native": { "analytics_auto_collection_enabled": false } }
```
```typescript
// After consent
await analytics().setAnalyticsCollectionEnabled(true);
```

---

## Event Design

### Naming: snake_case

```typescript
// ✅ Good
sendGAEvent("event", "add_to_cart", { item_id: "SKU123" });
// ❌ Bad
sendGAEvent("event", "AddToCart", { itemId: "SKU123" });
```

### Event Taxonomy

```typescript
// lib/analytics.ts
import { sendGAEvent } from "@next/third-parties/google";

export const Analytics = {
  signUp: (method: string) => sendGAEvent("event", "sign_up", { method }),
  login: (method: string) => sendGAEvent("event", "login", { method }),
  search: (term: string) => sendGAEvent("event", "search", { search_term: term }),
  
  viewItem: (item: Item) => sendGAEvent("event", "view_item", {
    currency: "USD", value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  }),
  
  addToCart: (item: Item, qty: number) => sendGAEvent("event", "add_to_cart", {
    currency: "USD", value: item.price * qty,
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: qty }],
  }),
  
  purchase: (txId: string, value: number, items: Item[]) => sendGAEvent("event", "purchase", {
    transaction_id: txId, value, currency: "USD",
    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price })),
  }),
};
```

---

## E-commerce Flow

```typescript
// 1. View → 2. Add to cart → 3. Begin checkout → 4. Purchase
sendGAEvent("event", "view_item", { value: 29.99, items: [...] });
sendGAEvent("event", "add_to_cart", { value: 29.99, items: [...] });
sendGAEvent("event", "begin_checkout", { value: 29.99, items: [...] });
sendGAEvent("event", "purchase", { transaction_id: "T123", value: 32.99, items: [...] });
```

---

## User Tracking

```typescript
// User ID (after login)
window.gtag("config", "G-XXXXXXXXXX", { user_id: "USER_123" });

// User properties
sendGAEvent("set", "user_properties", { subscription_tier: "premium" });

// React Native
analytics().setUserId("USER_123");
analytics().setUserProperties({ subscription_tier: "premium" });
```

---

## Debug

```typescript
// Enable debug mode
window.gtag("config", "G-XXXXXXXXXX", { debug_mode: true });
```

**GA4 DebugView**: Admin → DebugView
**Chrome**: Install "Google Analytics Debugger" extension

**React Native:**
- iOS: Add `-FIRDebugEnabled` in Xcode scheme
- Android: `adb shell setprop debug.firebase.analytics.app <package>`

---

## Consent Mode

```typescript
// Default deny
window.gtag("consent", "default", { analytics_storage: "denied" });

// After consent
window.gtag("consent", "update", { analytics_storage: "granted" });
```

---

## Checklist

```
□ Install SDK for platform
□ Configure measurement ID
□ Verify page views tracking
□ Define events (snake_case)
□ Set up conversion events
□ Test with DebugView
□ Disable in development
□ Implement consent (if GDPR)
```
