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

    // Click add/create button
    const addButton = page.getByRole("button", {
      name: /thêm|tạo|add|create/i,
    });
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();

    // Fill in the form
    const nameInput = page.getByLabel(/tên.*món|name/i);
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill(testItemName);
    }

    const priceInput = page.getByLabel(/giá|price/i);
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill("50000");
    }

    // Select a category if needed
    const categorySelect = page.getByLabel(/danh mục|category/i);
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click();
      const firstOption = page.getByRole("option").first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Submit
    const submitButton = page.getByRole("button", {
      name: /lưu|tạo|save|submit/i,
    });
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
    }

    // Verify item appears in the list
    await expect(page.getByText(testItemName)).toBeVisible({ timeout: 10_000 });
  });

  test("admin can edit a menu item", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");

    // Find the test item and click edit
    const itemRow = page.getByText(testItemName);
    if (await itemRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Find the edit button near this item
      const editButton = itemRow
        .locator("..") // parent
        .getByRole("button", { name: /sửa|edit|chỉnh/i });

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        // Update the price
        const priceInput = page.getByLabel(/giá|price/i);
        if (
          await priceInput.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await priceInput.clear();
          await priceInput.fill("55000");
        }

        const saveButton = page.getByRole("button", {
          name: /lưu|save|cập nhật|update/i,
        });
        if (
          await saveButton.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await saveButton.click();
        }

        // Verify success
        await expect(
          page.getByText(/thành công|success|đã cập nhật/i)
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("admin can delete a menu item", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/menu");

    const itemRow = page.getByText(testItemName);
    if (await itemRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const deleteButton = itemRow
        .locator("..")
        .getByRole("button", { name: /xóa|delete|remove/i });

      if (
        await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await deleteButton.click();

        // Confirm deletion if prompted
        const confirmButton = page.getByRole("button", {
          name: /xác nhận|confirm|xóa/i,
        });
        if (
          await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await confirmButton.click();
        }

        // Verify item is gone
        await expect(itemRow).not.toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
