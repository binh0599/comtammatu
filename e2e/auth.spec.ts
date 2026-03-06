import { test, expect } from "./fixtures/auth";

test.describe("Authentication", () => {
  test("shows login form with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mật khẩu")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng nhập" })
    ).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("invalid@example.com");
    await page.getByLabel("Mật khẩu").fill("wrongpassword");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("owner login redirects to /admin", async ({ page, loginAs }) => {
    await loginAs("owner");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("manager login redirects to /admin", async ({ page, loginAs }) => {
    await loginAs("manager");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout redirects to /login", async ({ page, loginAs }) => {
    await loginAs("owner");
    await expect(page).toHaveURL(/\/admin/);

    // Try direct logout button first, fall back to user menu dropdown
    const logoutButton = page.getByRole("button", { name: /đăng xuất|logout/i });
    const userMenu = page.getByRole("button", { name: /menu|user|avatar/i });

    if (await logoutButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
    } else {
      await expect(userMenu).toBeVisible({ timeout: 5_000 });
      await userMenu.click();
      const menuItem = page.getByRole("menuitem", { name: /đăng xuất|logout/i });
      await expect(menuItem).toBeVisible({ timeout: 5_000 });
      await menuItem.click();
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
