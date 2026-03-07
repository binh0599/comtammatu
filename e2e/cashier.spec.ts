import { test, expect } from "./fixtures/auth";

test.describe("Cashier / POS", () => {
  test("cashier can navigate to cashier page", async ({ page, loginAs }) => {
    await loginAs("cashier");

    await page.goto("/pos/cashier");

    // Cashier page requires an active POS session — if redirected to
    // /pos/session that is expected behavior (no open session).
    await expect(page).toHaveURL(/\/pos\/(cashier|session)/, {
      timeout: 15_000,
    });
  });

  test("order queue loads on cashier page", async ({ page, loginAs }) => {
    await loginAs("cashier");
    await page.goto("/pos/cashier");

    // If redirected to session page, skip — no active session
    const url = page.url();
    test.skip(
      /\/pos\/session/.test(url),
      "No active POS session — cashier page requires open session"
    );

    // Order queue filter tabs should be visible
    await expect(
      page.getByText(/tất cả|chưa thanh toán|sẵn sàng/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("payment panel elements exist", async ({ page, loginAs }) => {
    await loginAs("cashier");
    await page.goto("/pos/cashier");

    const url = page.url();
    test.skip(
      /\/pos\/session/.test(url),
      "No active POS session — cashier page requires open session"
    );

    // Session bar should show terminal/cashier info
    await expect(
      page.getByText(/máy|terminal|ca làm|phiên/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Payment panel area should be present (right side)
    await expect(
      page.getByText(/thanh toán|payment/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
