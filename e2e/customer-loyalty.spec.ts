import { test, expect } from "./fixtures/auth";

test.describe("Customer Loyalty Flow", () => {
  test("CRM page loads with 5 tabs", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");
    await expect(page).toHaveURL(/\/admin\/crm/);

    // Verify all 5 tabs are visible
    const tabs = [/khách hàng/i, /hạng thành viên/i, /tích điểm/i, /voucher/i, /phản hồi/i];

    for (const tabName of tabs) {
      await expect(page.getByRole("tab", { name: tabName })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("earn rules tab loads and shows content", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const earnRulesTab = page.getByRole("tab", { name: /tích điểm/i });
    await expect(earnRulesTab).toBeVisible({ timeout: 10_000 });
    await earnRulesTab.click();

    await expect(earnRulesTab).toHaveAttribute("data-state", "active");

    // Verify earn rules content renders
    await expect(page.getByText(/quy tắc tích điểm/i).first()).toBeVisible({ timeout: 10_000 });

    // Verify "Thêm quy tắc" button is visible
    await expect(page.getByRole("button", { name: /thêm quy tắc/i })).toBeVisible();
  });

  test("can open create earn rule dialog", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    // Click earn rules tab
    const earnRulesTab = page.getByRole("tab", { name: /tích điểm/i });
    await earnRulesTab.click();
    await expect(earnRulesTab).toHaveAttribute("data-state", "active");

    // Click create button
    await page.getByRole("button", { name: /thêm quy tắc/i }).click();

    // Verify dialog opens with form fields
    await expect(page.getByText(/thêm quy tắc tích điểm/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByLabel(/tên quy tắc/i)).toBeVisible();
    await expect(page.getByLabel(/điểm tích/i)).toBeVisible();
    await expect(page.getByLabel(/mức chi tiêu/i)).toBeVisible();
  });

  test("loyalty tiers tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const loyaltyTab = page.getByRole("tab", { name: /hạng thành viên/i });
    await expect(loyaltyTab).toBeVisible({ timeout: 10_000 });
    await loyaltyTab.click();

    await expect(loyaltyTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText(/hạng thành viên/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("vouchers tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    const vouchersTab = page.getByRole("tab", { name: /voucher/i });
    await expect(vouchersTab).toBeVisible({ timeout: 10_000 });
    await vouchersTab.click();

    await expect(vouchersTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText(/voucher/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("customers tab displays stats cards", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/crm");

    // Stats cards should be visible at the top
    await expect(page.getByText(/tổng khách hàng/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
