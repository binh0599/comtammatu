import { test, expect, TEST_ACCOUNTS } from "./fixtures/auth";

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

    // Find and click logout — look for the user menu or logout button
    const logoutButton = page.getByRole("button", { name: /đăng xuất|logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // May be inside a dropdown menu
      const userMenu = page.getByRole("button", { name: /menu|user|avatar/i });
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page
          .getByRole("menuitem", { name: /đăng xuất|logout/i })
          .click();
      }
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
