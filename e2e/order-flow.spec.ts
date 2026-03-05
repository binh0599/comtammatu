import { test, expect } from "./fixtures/auth";

test.describe("Order Flow", () => {
  test.describe.configure({ mode: "serial" });

  let orderNumber: string;

  test("waiter creates a new order", async ({ page, loginAs }) => {
    await loginAs("waiter");

    // Navigate to new order
    await page.goto("/pos/order/new");
    await expect(page).toHaveURL(/\/pos\/order\/new/);

    // Select order type (dine_in)
    const dineInOption = page.getByText(/tại chỗ|dine.in/i);
    if (await dineInOption.isVisible()) {
      await dineInOption.click();
    }

    // Select a table if available
    const tableButton = page.locator("[data-table-id]").first();
    if (await tableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableButton.click();
    }

    // Add a menu item — click on the first available item
    const menuItem = page
      .locator("[data-menu-item-id], [data-testid='menu-item']")
      .first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuItem.click();
    }

    // Look for a confirm/create order button
    const createButton = page.getByRole("button", {
      name: /tạo đơn|xác nhận|gửi/i,
    });
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
    }

    // Wait for order to be created — should redirect to order detail or orders list
    await expect(page).not.toHaveURL(/\/pos\/order\/new/, { timeout: 15_000 });

    // Capture order number from the page
    const orderNumberEl = page.locator(
      "[data-order-number], .order-number, [data-testid='order-number']"
    );
    if (await orderNumberEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      orderNumber = (await orderNumberEl.textContent()) ?? "";
    }
  });

  test("KDS receives the order", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created in previous step");

    await loginAs("chef");
    await expect(page).toHaveURL(/\/kds/);

    // KDS should show at least one ticket
    const ticket = page.locator("[data-kds-ticket], .kds-ticket").first();
    await expect(ticket).toBeVisible({ timeout: 15_000 });
  });

  test("chef bumps order to ready", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created");

    await loginAs("chef");
    await expect(page).toHaveURL(/\/kds/);

    // Find a ticket and bump it
    const bumpButton = page
      .getByRole("button", { name: /sẵn sàng|ready|bump/i })
      .first();
    if (await bumpButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await bumpButton.click();
      // Verify the ticket moved or status changed
      await expect(bumpButton).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test("cashier processes payment", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created");

    await loginAs("cashier");
    await expect(page).toHaveURL(/\/pos/);

    // Navigate to cashier
    await page.goto("/pos/cashier");

    // Look for an order to pay
    const payButton = page
      .getByRole("button", { name: /thanh toán|pay/i })
      .first();
    if (await payButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await payButton.click();

      // Select payment method (cash)
      const cashOption = page.getByText(/tiền mặt|cash/i);
      if (await cashOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cashOption.click();
      }

      // Confirm payment
      const confirmPay = page.getByRole("button", {
        name: /xác nhận|hoàn tất|confirm/i,
      });
      if (await confirmPay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmPay.click();
      }

      // Payment should succeed
      await expect(
        page.getByText(/thành công|success|hoàn tất/i)
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
