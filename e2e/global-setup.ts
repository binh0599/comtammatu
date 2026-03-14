import { test as setup } from "@playwright/test";

/**
 * Global setup — runs once before all tests.
 * Verifies the app is reachable.
 */
setup("verify app is running", async ({ request }) => {
  // Check login page reachability (health endpoint requires DB which may be unavailable locally)
  const response = await request.get("/login");
  if (!response.ok()) {
    throw new Error(`App is not reachable: ${response.status()} ${response.statusText()}`);
  }
});
