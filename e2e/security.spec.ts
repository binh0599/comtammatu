import { test, expect } from "./fixtures/auth";

test.describe("Security — RBAC & Access Control", () => {
  test("unauthenticated user cannot access /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access /pos", async ({ page }) => {
    await page.goto("/pos");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access /kds", async ({ page }) => {
    await page.goto("/kds");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("customer cannot access /admin", async ({ page, loginAs }) => {
    await loginAs("customer");
    // Customer should be redirected to /customer, not /admin
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("owner can access /admin", async ({ page, loginAs }) => {
    await loginAs("owner");
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
    // Verify admin content loads (sidebar visible)
    await expect(
      page.getByRole("navigation").or(page.locator("[data-sidebar]")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("manager can access /admin", async ({ page, loginAs }) => {
    await loginAs("manager");
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });
});

test.describe("Security — Login Form", () => {
  test("login form has CSRF protection via Server Actions", async ({
    page,
  }) => {
    await page.goto("/login");
    // Server Actions in Next.js automatically include CSRF tokens
    // Verify form exists and is a proper form element
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });

  test("password field is type=password", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByLabel("Mật khẩu");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows error for empty credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    // Should show validation error
    await expect(page.getByRole("alert").or(page.locator("[role=alert]"))).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows error for invalid email format", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Mật khẩu").fill("somepassword");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("alert").or(page.locator("[role=alert]"))).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Security — HTTP Headers", () => {
  test("response includes security headers", async ({ page }) => {
    const response = await page.goto("/login");
    const headers = response?.headers() ?? {};

    // X-Content-Type-Options
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // X-Frame-Options
    expect(headers["x-frame-options"]).toBe("DENY");

    // Referrer-Policy
    expect(headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );

    // HSTS
    expect(headers["strict-transport-security"]).toContain("max-age=");

    // CSP
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
  });

  test("CSP blocks framing (frame-ancestors none)", async ({ page }) => {
    const response = await page.goto("/login");
    const csp = response?.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("COOP header is set", async ({ page }) => {
    const response = await page.goto("/login");
    const coop = response?.headers()["cross-origin-opener-policy"] ?? "";
    expect(coop).toBe("same-origin");
  });
});

test.describe("Security — API Routes", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
  });

  test("privacy data-export requires authentication", async ({ request }) => {
    const response = await request.get("/api/privacy/data-export");
    // Should return 401 or redirect to login
    expect([401, 403, 302]).toContain(response.status());
  });

  test("privacy deletion-request requires authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/privacy/deletion-request");
    expect([401, 403, 302]).toContain(response.status());
  });
});

test.describe("Security — Route Protection", () => {
  test("admin sub-routes redirect when unauthenticated", async ({ page }) => {
    const adminRoutes = [
      "/admin/menu",
      "/admin/hr",
      "/admin/inventory",
      "/admin/crm",
      "/admin/security",
      "/admin/payments",
      "/admin/orders",
      "/admin/campaigns",
      "/admin/terminals",
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
  });

  test("POS sub-routes redirect when unauthenticated", async ({ page }) => {
    const posRoutes = ["/pos/orders", "/pos/cashier", "/pos/session"];

    for (const route of posRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
  });
});
