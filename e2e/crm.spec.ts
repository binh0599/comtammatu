import { test, expect } from "./fixtures/auth";

test.describe("CRM Module", () => {
  test("admin can navigate to CRM page", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");
    await expect(page).toHaveURL(/\/admin\/crm/);
    await expect(page.getByText(/khách hàng/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("customers tab loads with table", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    // Customers tab is the default
    const customersTab = page.getByRole("tab", { name: /khách hàng/i });
    await expect(customersTab).toBeVisible({ timeout: 10_000 });
    await expect(customersTab).toHaveAttribute("data-state", "active");

    // Verify table or list is rendered
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  });

  test("loyalty tiers tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const loyaltyTab = page.getByRole("tab", { name: /hạng thành viên/i });
    await expect(loyaltyTab).toBeVisible({ timeout: 10_000 });
    await loyaltyTab.click();

    await expect(loyaltyTab).toHaveAttribute("data-state", "active");

    // Verify tab content is rendered
    await expect(
      page.getByText(/hạng thành viên|loyalty/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("vouchers tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const vouchersTab = page.getByRole("tab", { name: /voucher/i });
    await expect(vouchersTab).toBeVisible({ timeout: 10_000 });
    await vouchersTab.click();

    await expect(vouchersTab).toHaveAttribute("data-state", "active");

    await expect(
      page.getByText(/voucher/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("feedback tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const feedbackTab = page.getByRole("tab", { name: /phản hồi/i });
    await expect(feedbackTab).toBeVisible({ timeout: 10_000 });
    await feedbackTab.click();

    await expect(feedbackTab).toHaveAttribute("data-state", "active");

    await expect(
      page.getByText(/phản hồi|feedback/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
