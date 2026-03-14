import { test, expect } from "./fixtures/auth";

test.describe("Menu CRUD", () => {
  const testItemName = `E2E Test Item ${Date.now()}`;

  test("admin can navigate to menu management", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");
    await expect(page).toHaveURL(/\/admin\/menu/);
    await expect(page.getByText(/thực đơn|menu/i).first()).toBeVisible();
  });

  test("admin can create a menu item", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");

    const addButton = page.getByRole("button", {
      name: /thêm|tạo|add|create/i,
    });
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();

    const nameInput = page.getByLabel(/tên.*món|name/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(testItemName);

    const priceInput = page.getByLabel(/giá|price/i);
    await expect(priceInput).toBeVisible({ timeout: 3_000 });
    await priceInput.fill("50000");

    // Select a category if needed
    const categorySelect = page.getByLabel(/danh mục|category/i);
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click();
      const firstOption = page.getByRole("option").first();
      await expect(firstOption).toBeVisible({ timeout: 3_000 });
      await firstOption.click();
    }

    const submitButton = page.getByRole("button", {
      name: /lưu|tạo|save|submit/i,
    });
    await expect(submitButton).toBeVisible({ timeout: 3_000 });
    await submitButton.click();

    await expect(page.getByText(testItemName)).toBeVisible({ timeout: 10_000 });
  });

  test("admin can edit a menu item", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");

    const itemRow = page.getByText(testItemName);
    await expect(itemRow).toBeVisible({ timeout: 10_000 });

    const editButton = itemRow.locator("..").getByRole("button", { name: /sửa|edit|chỉnh/i });
    await expect(editButton).toBeVisible({ timeout: 3_000 });
    await editButton.click();

    const priceInput = page.getByLabel(/giá|price/i);
    await expect(priceInput).toBeVisible({ timeout: 3_000 });
    await priceInput.clear();
    await priceInput.fill("55000");

    const saveButton = page.getByRole("button", {
      name: /lưu|save|cập nhật|update/i,
    });
    await expect(saveButton).toBeVisible({ timeout: 3_000 });
    await saveButton.click();

    await expect(page.getByText(/thành công|success|đã cập nhật/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("admin can delete a menu item", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");

    const itemRow = page.getByText(testItemName);
    await expect(itemRow).toBeVisible({ timeout: 10_000 });

    const deleteButton = itemRow.locator("..").getByRole("button", { name: /xóa|delete|remove/i });
    await expect(deleteButton).toBeVisible({ timeout: 3_000 });
    await deleteButton.click();

    // Confirm deletion if prompted
    const confirmButton = page.getByRole("button", {
      name: /xác nhận|confirm|xóa/i,
    });
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(itemRow).not.toBeVisible({ timeout: 10_000 });
  });
});
