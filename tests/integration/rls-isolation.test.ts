/**
 * RLS Isolation Integration Tests
 *
 * Verifies cross-tenant isolation and unauthenticated access blocking.
 */

import {
  createAnonClient,
  createAuthClient,
  createServiceClient,
  assertBlocked,
  SEED,
} from "./helpers";

describe("RLS Isolation", () => {
  describe("Owner can read own tenant branches", () => {
    it("returns branches belonging to the owner's tenant", async () => {
      const client = await createAuthClient("owner");
      const { data, error } = await client
        .from("branches")
        .select("id, tenant_id, name")
        .eq("tenant_id", SEED.tenantId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.every((b) => b.tenant_id === SEED.tenantId)).toBe(true);
    });
  });

  describe("Owner cannot read another tenant's data", () => {
    it("returns zero rows for a different tenant's branches", async () => {
      const service = createServiceClient();
      // Find a tenant that is NOT the test tenant
      const { data: tenants } = await service
        .from("tenants")
        .select("id")
        .neq("id", SEED.tenantId)
        .limit(1);

      if (!tenants || tenants.length === 0) {
        // Only one tenant exists — skip gracefully
        return;
      }

      const otherTenantId = tenants[0]!.id;
      const ownerClient = await createAuthClient("owner");
      const result = await ownerClient
        .from("branches")
        .select("id, tenant_id")
        .eq("tenant_id", otherTenantId);

      assertBlocked(result);
    });

    it("owner cannot read other tenant's menu items", async () => {
      const service = createServiceClient();
      const { data: otherItems } = await service
        .from("menu_items")
        .select("id, tenant_id")
        .neq("tenant_id", SEED.tenantId)
        .limit(1);

      if (!otherItems || otherItems.length === 0) return;

      const ownerClient = await createAuthClient("owner");
      const result = await ownerClient
        .from("menu_items")
        .select("id")
        .eq("id", otherItems[0]!.id);

      assertBlocked(result);
    });
  });

  describe("Customer can read own loyalty data only", () => {
    it("customer sees only their tenant's loyalty tiers", async () => {
      const client = await createAuthClient("customer");
      const { data, error } = await client
        .from("loyalty_tiers")
        .select("id, tenant_id");

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data.every((t) => t.tenant_id === SEED.tenantId)).toBe(true);
      }
    });
  });

  describe("Unauthenticated client gets zero rows", () => {
    it("anon cannot read branches", async () => {
      const anon = createAnonClient();
      const result = await anon.from("branches").select("id");
      assertBlocked(result);
    });

    it("anon cannot read orders", async () => {
      const anon = createAnonClient();
      const result = await anon.from("orders").select("id");
      assertBlocked(result);
    });

    it("anon cannot read profiles", async () => {
      const anon = createAnonClient();
      const result = await anon.from("profiles").select("id");
      assertBlocked(result);
    });

    it("anon cannot read menu_items", async () => {
      const anon = createAnonClient();
      const result = await anon.from("menu_items").select("id");
      assertBlocked(result);
    });
  });
});
