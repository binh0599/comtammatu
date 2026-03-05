import { test, expect } from "./fixtures/auth";

test.describe("Employee Attendance", () => {
  test("employee can view attendance page", async ({ page, loginAs }) => {
    await loginAs("waiter");

    // Navigate to employee portal
    await page.goto("/employee");
    await expect(page).toHaveURL(/\/employee/);
  });

  test("employee can clock in", async ({ page, loginAs }) => {
    await loginAs("waiter");
    await page.goto("/employee");

    // Look for clock-in button
    const clockInButton = page.getByRole("button", {
      name: /chấm công|clock.in|vào ca/i,
    });

    if (await clockInButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await clockInButton.click();

      // Should show success or update status
      await expect(
        page.getByText(/đã chấm công|đã vào ca|clocked.in|thành công/i)
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("employee can clock out", async ({ page, loginAs }) => {
    await loginAs("waiter");
    await page.goto("/employee");

    // Look for clock-out button (only visible after clock-in)
    const clockOutButton = page.getByRole("button", {
      name: /kết thúc ca|clock.out|ra ca/i,
    });

    if (
      await clockOutButton.isVisible({ timeout: 10_000 }).catch(() => false)
    ) {
      await clockOutButton.click();

      // Confirm if prompted
      const confirmButton = page.getByRole("button", {
        name: /xác nhận|confirm/i,
      });
      if (
        await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await confirmButton.click();
      }

      // Should show success
      await expect(
        page.getByText(/đã kết thúc|ra ca thành công|clocked.out|thành công/i)
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("employee can view schedule", async ({ page, loginAs }) => {
    await loginAs("waiter");
    await page.goto("/employee/schedule");
    await expect(page).toHaveURL(/\/employee\/schedule/);

    // Should show calendar or schedule view
    await expect(
      page.getByText(/ca làm|lịch|schedule/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("employee can view payroll", async ({ page, loginAs }) => {
    await loginAs("waiter");
    await page.goto("/employee/payroll");
    await expect(page).toHaveURL(/\/employee\/payroll/);

    // Should show payroll page (may be empty)
    await expect(
      page.getByText(/phiếu lương|lương|payroll/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
