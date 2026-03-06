import { test, expect } from "./fixtures/auth";

test.describe("Order Flow", () => {
  test.describe.configure({ mode: "serial" });

  let orderNumber: string;

  test("waiter creates a new order", async ({ page, loginAs }) => {
    await loginAs("waiter");

    await page.goto("/pos/order/new");
    await expect(page).toHaveURL(/\/pos\/order\/new/);

    // Select order type (dine_in)
    const dineInOption = page.getByText(/tại chỗ|dine.in/i);
    if (await dineInOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dineInOption.click();
    }

    // Select a table if available
    const tableButton = page.locator("[data-table-id]").first();
    if (await tableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableButton.click();
    }

    // Add a menu item
    const menuItem = page
      .locator("[data-menu-item-id], [data-testid='menu-item']")
      .first();
    await expect(menuItem).toBeVisible({ timeout: 5_000 });
    await menuItem.click();

    // Confirm/create order
    const createButton = page.getByRole("button", {
      name: /tạo đơn|xác nhận|gửi/i,
    });
    await expect(createButton).toBeVisible({ timeout: 3_000 });
    await createButton.click();

    // Should redirect away from new order page
    await expect(page).not.toHaveURL(/\/pos\/order\/new/, { timeout: 15_000 });

    // Capture order number — fail fast if not found
    const orderNumberEl = page.locator(
      "[data-order-number], .order-number, [data-testid='order-number']"
    );
    await expect(orderNumberEl).toBeVisible({ timeout: 5_000 });
    const text = await orderNumberEl.textContent();
    if (!text) {
      throw new Error("Order number element is visible but has no text content");
    }
    orderNumber = text;
  });

  test("KDS receives the order", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created in previous step");

    await loginAs("chef");
    await expect(page).toHaveURL(/\/kds/);

    // KDS should show the ticket for the created order
    const ticket = page
      .locator("[data-kds-ticket]")
      .filter({ hasText: orderNumber })
      .first();
    await expect(ticket).toBeVisible({ timeout: 15_000 });
  });

  test("chef bumps order to ready", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created");

    await loginAs("chef");
    await expect(page).toHaveURL(/\/kds/);

    // Scope to the ticket for this order
    const ticket = page
      .locator("[data-kds-ticket]")
      .filter({ hasText: orderNumber })
      .first();
    await expect(ticket).toBeVisible({ timeout: 10_000 });

    const bumpButton = ticket.getByRole("button", {
      name: /sẵn sàng|ready|bump/i,
    });
    await expect(bumpButton).toBeVisible({ timeout: 5_000 });
    await bumpButton.click();

    // Verify the ticket moved or status changed
    await expect(bumpButton).not.toBeVisible({ timeout: 5_000 });
  });

  test("cashier processes payment", async ({ page, loginAs }) => {
    test.skip(!orderNumber, "No order was created");

    await loginAs("cashier");
    await expect(page).toHaveURL(/\/pos/);

    await page.goto("/pos/cashier");

    // Scope to the row/card for this order
    const orderRow = page
      .locator("[data-order-row], [data-order-id], [data-testid='order-card']")
      .filter({ hasText: orderNumber })
      .first();
    await expect(orderRow).toBeVisible({ timeout: 10_000 });

    const payButton = orderRow.getByRole("button", {
      name: /thanh toán|pay/i,
    });
    await expect(payButton).toBeVisible({ timeout: 5_000 });
    await payButton.click();

    // Select payment method (cash)
    const cashOption = page.getByText(/tiền mặt|cash/i);
    await expect(cashOption).toBeVisible({ timeout: 3_000 });
    await cashOption.click();

    // Confirm payment
    const confirmPay = page.getByRole("button", {
      name: /xác nhận|hoàn tất|confirm/i,
    });
    await expect(confirmPay).toBeVisible({ timeout: 3_000 });
    await confirmPay.click();

    // Payment should succeed
    await expect(
      page.getByText(/thành công|success|hoàn tất/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
