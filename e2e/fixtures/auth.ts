import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test accounts — must exist in the Supabase project.
 * Set via environment variables or fall back to defaults for local dev.
 */
export const TEST_ACCOUNTS = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL ?? "owner@comtammatu.vn",
    password: process.env.E2E_OWNER_PASSWORD ?? "Test1234!",
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? "manager@comtammatu.vn",
    password: process.env.E2E_MANAGER_PASSWORD ?? "Test1234!",
  },
  cashier: {
    email: process.env.E2E_CASHIER_EMAIL ?? "cashier@comtammatu.vn",
    password: process.env.E2E_CASHIER_PASSWORD ?? "Test1234!",
  },
  waiter: {
    email: process.env.E2E_WAITER_EMAIL ?? "waiter@comtammatu.vn",
    password: process.env.E2E_WAITER_PASSWORD ?? "Test1234!",
  },
  chef: {
    email: process.env.E2E_CHEF_EMAIL ?? "chef@comtammatu.vn",
    password: process.env.E2E_CHEF_PASSWORD ?? "Test1234!",
  },
  customer: {
    email: process.env.E2E_CUSTOMER_EMAIL ?? "customer@comtammatu.vn",
    password: process.env.E2E_CUSTOMER_PASSWORD ?? "Test1234!",
  },
} as const;

type Role = keyof typeof TEST_ACCOUNTS;

/**
 * Login helper — fills the login form and submits.
 * Waits for redirect away from /login.
 */
async function loginAs(page: Page, role: Role) {
  const account = TEST_ACCOUNTS[role];

  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  // Wait for redirect away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/**
 * Extended test fixture that provides a `loginAs` helper.
 */
export const test = base.extend<{ loginAs: (role: Role) => Promise<void> }>({
  loginAs: async ({ page }, use) => {
    await use((role: Role) => loginAs(page, role));
  },
});

export { expect };
