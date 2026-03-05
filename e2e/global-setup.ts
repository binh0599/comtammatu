import { test as setup } from "@playwright/test";

/**
 * Global setup — runs once before all tests.
 * Verifies the app is reachable.
 */
setup("verify app is running", async ({ request }) => {
  const response = await request.get("/api/health");
  if (!response.ok()) {
    throw new Error(
      `App health check failed: ${response.status()} ${response.statusText()}`
    );
  }
});
