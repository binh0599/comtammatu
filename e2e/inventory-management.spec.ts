import { test, expect } from "./fixtures/auth";

test.describe("Inventory Management Flow", () => {
  test("inventory page loads all tabs", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");
    await expect(page).toHaveURL(/\/admin\/inventory/);

    // Verify key tabs are visible
    const tabs = [/nguyên liệu/i, /tồn kho/i, /nhập\/xuất kho/i, /nhà cung cấp/i, /đơn mua hàng/i];

    for (const tabName of tabs) {
      await expect(page.getByRole("tab", { name: tabName })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("ingredients tab shows table", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    // Ingredients tab is the default
    const ingredientsTab = page.getByRole("tab", { name: /nguyên liệu/i });
    await expect(ingredientsTab).toHaveAttribute("data-state", "active");

    // Verify table is rendered
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  });

  test("can open create ingredient dialog", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    // Click create ingredient button
    const createBtn = page.getByRole("button", { name: /thêm nguyên liệu/i });
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    // Verify dialog form fields
    await expect(page.getByLabel(/tên nguyên liệu/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByLabel(/đơn vị/i)).toBeVisible();
  });

  test("stock levels tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const stockTab = page.getByRole("tab", { name: /tồn kho/i });
    await stockTab.click();
    await expect(stockTab).toHaveAttribute("data-state", "active");

    // Verify content loads
    await expect(page.getByText(/tồn kho/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("stock movements tab loads with transfer button", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const movementsTab = page.getByRole("tab", { name: /nhập\/xuất kho/i });
    await movementsTab.click();
    await expect(movementsTab).toHaveAttribute("data-state", "active");

    // Verify both main action buttons are visible
    await expect(page.getByRole("button", { name: /tạo phiếu/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /chuyển kho/i })).toBeVisible();
  });

  test("suppliers tab loads with analytics section", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const suppliersTab = page.getByRole("tab", { name: /nhà cung cấp/i });
    await suppliersTab.click();
    await expect(suppliersTab).toHaveAttribute("data-state", "active");

    // Verify supplier content
    await expect(page.getByText(/nhà cung cấp/i).first()).toBeVisible({ timeout: 10_000 });

    // Verify analytics section exists
    await expect(page.getByText(/xem phân tích/i)).toBeVisible({ timeout: 10_000 });
  });

  test("purchase orders tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/inventory");

    const poTab = page.getByRole("tab", { name: /đơn mua hàng/i });
    await poTab.click();
    await expect(poTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/đơn mua hàng/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
