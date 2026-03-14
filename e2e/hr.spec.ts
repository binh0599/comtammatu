import { test, expect } from "./fixtures/auth";

test.describe("HR Module", () => {
  test("admin can navigate to HR page", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");
    await expect(page).toHaveURL(/\/admin\/hr/);
    await expect(page.getByText(/nhân sự/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("employees tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    // Employees tab is the default
    const employeesTab = page.getByRole("tab", { name: /nhân viên/i });
    await expect(employeesTab).toBeVisible({ timeout: 10_000 });
    await expect(employeesTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/nhân viên/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("shifts tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    const shiftsTab = page.getByRole("tab", { name: /ca làm/i });
    await expect(shiftsTab).toBeVisible({ timeout: 10_000 });
    await shiftsTab.click();

    await expect(shiftsTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/ca làm|shift/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("schedule tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    const scheduleTab = page.getByRole("tab", { name: /lịch phân ca/i });
    await expect(scheduleTab).toBeVisible({ timeout: 10_000 });
    await scheduleTab.click();

    await expect(scheduleTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/lịch phân ca|schedule/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("attendance tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    const attendanceTab = page.getByRole("tab", { name: /chấm công/i });
    await expect(attendanceTab).toBeVisible({ timeout: 10_000 });
    await attendanceTab.click();

    await expect(attendanceTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/chấm công|attendance/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("leave tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    const leaveTab = page.getByRole("tab", { name: /nghỉ phép/i });
    await expect(leaveTab).toBeVisible({ timeout: 10_000 });
    await leaveTab.click();

    await expect(leaveTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/nghỉ phép|leave/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("payroll tab loads", async ({ page, loginAs }) => {
    await loginAs("owner");
    await page.goto("/admin/hr");

    const payrollTab = page.getByRole("tab", { name: /bảng lương/i });
    await expect(payrollTab).toBeVisible({ timeout: 10_000 });
    await payrollTab.click();

    await expect(payrollTab).toHaveAttribute("data-state", "active");

    await expect(page.getByText(/bảng lương|payroll/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
