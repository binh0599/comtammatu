import { test, expect } from "./fixtures/auth";

test.describe("Inventory Module", () => {
  test("admin can navigate to inventory page", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");
    await expect(page).toHaveURL(/\/admin\/inventory/);
    await expect(page.getByText(/kho hàng/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("ingredients tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    // Ingredients tab is the default
    const ingredientsTab = page.getByRole("tab", { name: /nguyên liệu/i });
    await expect(ingredientsTab).toBeVisible({ timeout: 10_000 });
    await expect(ingredientsTab).toHaveAttribute("data-state", "active");

    // Verify content rendered (table or list)
    await expect(page.getByText(/nguyên liệu/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("stock levels tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const stockTab = page.getByRole("tab", { name: /tồn kho/i });
    await expect(stockTab).toBeVisible({ timeout: 10_000 });
    await stockTab.click();

    await expect(stockTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/tồn kho|stock/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("suppliers tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const suppliersTab = page.getByRole("tab", { name: /nhà cung cấp/i });
    await expect(suppliersTab).toBeVisible({ timeout: 10_000 });
    await suppliersTab.click();

    await expect(suppliersTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/nhà cung cấp|supplier/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("purchase orders tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const poTab = page.getByRole("tab", { name: /đơn mua hàng/i });
    await expect(poTab).toBeVisible({ timeout: 10_000 });
    await poTab.click();

    await expect(poTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/đơn mua hàng|purchase order/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
