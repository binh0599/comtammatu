/**
 * Auth Integration Tests
 *
 * Tests authentication flows against the real Supabase project.
 */

import { createAnonClient, createAuthClient, TEST_ACCOUNTS, TEST_PASSWORD } from "./helpers";

describe("Auth Integration", () => {
  describe("Login with valid credentials", () => {
    it("owner can sign in and get a session", async () => {
      const client = await createAuthClient("owner");
      const { data } = await client.auth.getSession();
      expect(data.session).not.toBeNull();
      expect(data.session!.user.email).toBe(TEST_ACCOUNTS.owner);
    });

    it("customer can sign in and get a session", async () => {
      const client = await createAuthClient("customer");
      const { data } = await client.auth.getSession();
      expect(data.session).not.toBeNull();
      expect(data.session!.user.email).toBe(TEST_ACCOUNTS.customer);
    });
  });

  describe("Login with wrong password", () => {
    it("returns an error for incorrect password", async () => {
      const client = createAnonClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: TEST_ACCOUNTS.owner,
        password: "WrongPassword123!",
      });
      expect(error).not.toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe("getUser returns correct profile", () => {
    it("returns the authenticated user after login", async () => {
      const client = await createAuthClient("manager");
      const { data, error } = await client.auth.getUser();
      expect(error).toBeNull();
      expect(data.user).not.toBeNull();
      expect(data.user!.email).toBe(TEST_ACCOUNTS.manager);
    });

    it("profile row matches the auth user", async () => {
      const client = await createAuthClient("cashier");
      const { data: authData } = await client.auth.getUser();
      const userId = authData.user!.id;

      const { data: profile, error } = await client
        .from("profiles")
        .select("id, role, tenant_id")
        .eq("id", userId)
        .single();

      expect(error).toBeNull();
      expect(profile).not.toBeNull();
      expect(profile!.id).toBe(userId);
      expect(profile!.role).toBe("cashier");
    });
  });

  describe("Sign out", () => {
    it("clears the session after sign out", async () => {
      const client = await createAuthClient("waiter");
      const { data: before } = await client.auth.getSession();
      expect(before.session).not.toBeNull();

      await client.auth.signOut();

      const { data: after } = await client.auth.getSession();
      expect(after.session).toBeNull();
    });
  });
});
