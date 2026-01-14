---
name: playwright
description: |
  Playwright E2E testing patterns for Next.js and React apps.
  Use when: writing E2E tests, testing user flows, setting up Playwright.
  Do not use for: running tests (use test-runner agent), unit tests (use vitest skill).
  Workflow: Write tests with this skill → Run with test-runner agent.
---

# Playwright E2E Testing

**For latest Playwright APIs, use context7 MCP server with library-id `microsoft/playwright`.**

E2E tests are expensive. **Focus on critical business flows only** - the paths where bugs cost real money or users.

---

## When to Use E2E

| ✅ Use for | ❌ Don't use for |
|-----------|-----------------|
| Critical user journeys (login, checkout) | Edge cases (use unit tests) |
| Regression before deploy | UI details (use component tests) |
| Verifying integrations work | Every feature (diminishing returns) |

---

## Quick Setup

```bash
bun create playwright
```

**For configuration options, see [Playwright Config docs](https://playwright.dev/docs/test-configuration).**

---

## Selector Priority

Use in this order (higher = more stable):

```typescript
// 1st: Role (most stable)
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

**Rule: Never use CSS selectors or XPath. They break on UI changes.**

```typescript
// ❌ Fragile
page.locator('.btn-primary')
page.locator('div > form > button')

// ✅ Stable
page.getByRole('button', { name: 'Submit' })
```

---

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
test('submit form → success', async ({ page }) => {
  await page.goto('/contact');
  
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByLabel('Message').fill('Test message');
  await page.getByRole('button', { name: 'Send' }).click();
  
  await expect(page.getByText(/sent|success/i)).toBeVisible();
});
```

---

## Waiting Strategy

**Rule: Never use fixed timeouts. Always wait for conditions.**

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

---

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

---

## What to Cover

Ask: **"If this breaks in production, how bad is it?"**

| Priority | Flow | Example |
|----------|------|---------|
| Critical | Revenue paths | Checkout, subscription |
| Critical | Auth | Login, signup, password reset |
| High | Core features | Main CRUD operations |
| Medium | Secondary | Settings, profile |
| Low | Nice-to-haves | Skip for E2E |

**Rule: 5-10 solid E2E tests beat 100 flaky ones.**

---

## Folder Structure

```
e2e/
├── auth.spec.ts        # Auth flows
├── checkout.spec.ts    # Payment flows
├── [feature].spec.ts   # Other critical paths
└── fixtures/
    └── test-data.ts    # Shared test data
```

---

## Quick Checklist

- [ ] Testing critical paths only (auth, checkout, core CRUD)
- [ ] Using role/label selectors (not CSS)
- [ ] No fixed timeouts (condition-based waits)
- [ ] API mocking for error states
- [ ] Running on CI before merge

---

## References

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators Guide](https://playwright.dev/docs/locators)
