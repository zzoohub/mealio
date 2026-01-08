---
name: e2e-test
description: Lightweight E2E testing focused on critical business flows. Playwright + Next.js/React setup. Covers only what matters - auth, CRUD, payments, and key user journeys.
---

# E2E Testing: Core Flows

E2E tests are expensive. Focus on critical business flows only - the paths where bugs cost real money or users.

## When to Use

- Validating critical user journeys (login, checkout, signup)
- Regression testing before deploy
- Verifying integrations actually work end-to-end

## When NOT to Use

- Testing edge cases (use unit tests)
- Testing UI details (use component tests)
- Testing every feature (diminishing returns)

## Quick Start (Next.js)

### 1. Install

```bash
npm init playwright@latest
```

Prompts:
- TypeScript? → Yes
- Test folder? → `e2e`
- GitHub Actions? → No (add later)
- Install browsers? → Yes

### 2. Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. First Test

```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
```

### 4. Run

```bash
npx playwright test              # Headless
npx playwright test --headed     # With browser
npx playwright test --ui         # UI mode (debugging)
```

## Core Flow Templates

### Auth Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('login → dashboard', async ({ page }) => {
  await page.goto('/login');
  
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page).toHaveURL(/.*dashboard/);
});

test('unauthenticated redirect', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/.*login/);
});
```

### CRUD Flow

```typescript
// e2e/crud.spec.ts
import { test, expect } from '@playwright/test';

test('create → verify → delete', async ({ page }) => {
  await page.goto('/items');
  
  // Create
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByLabel('Title').fill('Test Item');
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Verify
  await expect(page.getByText('Test Item')).toBeVisible();
  
  // Delete
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText('Test Item')).not.toBeVisible();
});
```

### Form Submission

```typescript
// e2e/form.spec.ts
import { test, expect } from '@playwright/test';

test('submit form → success', async ({ page }) => {
  await page.goto('/contact');
  
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByLabel('Message').fill('Test message');
  await page.getByRole('button', { name: 'Send' }).click();
  
  await expect(page.getByText(/sent|success|complete/i)).toBeVisible();
});
```

### Payment Flow

```typescript
// e2e/payment.spec.ts
import { test, expect } from '@playwright/test';

test('checkout → payment → confirmation', async ({ page }) => {
  await page.goto('/products');
  
  // Add to cart
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();
  
  // Checkout
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Payment (mock in test environment)
  await page.getByLabel('Card Number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Pay' }).click();
  
  // Confirmation
  await expect(page.getByText(/thank you|order confirmed/i)).toBeVisible();
});
```

## Selector Priority

Use in this order (higher = more stable):

```typescript
// 1st: Role
page.getByRole('button', { name: 'Save' })
page.getByRole('heading', { name: 'Dashboard' })

// 2nd: Label
page.getByLabel('Email')

// 3rd: Placeholder
page.getByPlaceholder('Search...')

// 4th: Text
page.getByText('Welcome')

// 5th: Test ID (last resort)
page.getByTestId('submit-button')
```

**Avoid:**
```typescript
// ❌ Fragile selectors
page.locator('.btn-primary')
page.locator('div > form > button')
page.locator('li:nth-child(2)')
```

## API Mocking

```typescript
test('handle API failure gracefully', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' }),
    });
  });

  await page.goto('/users');
  await expect(page.getByText(/error|failed/i)).toBeVisible();
});
```

## Waiting Strategy

```typescript
// ❌ Never
await page.waitForTimeout(3000);

// ✅ Always condition-based
await expect(page.getByText('Done')).toBeVisible();
await expect(page).toHaveURL('/success');

// ✅ Wait for API
const responsePromise = page.waitForResponse('**/api/save');
await page.getByRole('button', { name: 'Save' }).click();
await responsePromise;
```

## Debugging

```bash
npx playwright test --ui          # Visual debugging
npx playwright test --headed      # Watch it run
npx playwright test -g "login"    # Run specific test
```

```typescript
await page.pause(); // Stops execution, opens inspector
```

## Folder Structure

```
e2e/
├── smoke.spec.ts       # App loads
├── auth.spec.ts        # Auth flows
├── checkout.spec.ts    # Payment flows
└── [critical].spec.ts  # Other critical paths
```

## Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

## What to Cover

Ask: "If this breaks in production, how bad is it?"

| Priority | Flow | Example |
|----------|------|---------|
| Critical | Revenue paths | Checkout, subscription |
| Critical | Auth | Login, signup, password reset |
| High | Core features | Main CRUD operations |
| Medium | Secondary features | Settings, profile |
| Low | Nice-to-haves | Skip for E2E |

Keep it minimal. 5-10 core flow tests beat 100 flaky ones.


## References

Playwright Docs: https://playwright.dev/docs/intro
Playwright Next.js: https://nextjs.org/docs/app/guides/testing/playwright
Playwright Best Practices: https://playwright.dev/docs/best-practices
Playwright API Testing: https://playwright.dev/docs/api-testing
Playwright Locators: https://playwright.dev/docs/locators
