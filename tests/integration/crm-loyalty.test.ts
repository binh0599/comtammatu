/**
 * CRM Loyalty Integration Tests
 *
 * Tests customer loyalty point flow: read balance, verify tiers, earn points.
 */

import { createAuthClient, createServiceClient, cleanupRows, SEED } from "./helpers";

describe("CRM Loyalty", () => {
  const createdTransactionIds: number[] = [];
  let testCustomerId: number;

  afterAll(async () => {
    await cleanupRows("loyalty_transactions", createdTransactionIds);
  });

  it("loyalty tiers exist for the tenant", async () => {
    const client = await createAuthClient("owner");
    const { data: tiers, error } = await client
      .from("loyalty_tiers")
      .select("id, name, min_points, discount_pct")
      .eq("tenant_id", SEED.tenantId);

    expect(error).toBeNull();
    expect(tiers).not.toBeNull();
    expect(tiers!.length).toBeGreaterThan(0);
  });

  it("finds or creates a test customer", async () => {
    const service = createServiceClient();
    const { data: customers } = await service
      .from("customers")
      .select("id")
      .eq("tenant_id", SEED.tenantId)
      .limit(1);

    if (customers && customers.length > 0) {
      testCustomerId = customers[0]!.id;
    } else {
      const { data: newCust } = await service
        .from("customers")
        .insert({
          tenant_id: SEED.tenantId,
          phone: "[TEST]0900000099",
          full_name: "[TEST] Khách hàng thử nghiệm",
          source: "pos",
        })
        .select("id")
        .single();
      testCustomerId = newCust!.id;
    }

    expect(testCustomerId).toBeDefined();
  });

  it("reads customer current loyalty transactions", async () => {
    const service = createServiceClient();
    const { data: transactions, error } = await service
      .from("loyalty_transactions")
      .select("id, points, type, balance_after")
      .eq("customer_id", testCustomerId)
      .order("created_at", { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(transactions).not.toBeNull();
  });

  it("service client inserts a loyalty transaction (earn points)", async () => {
    const service = createServiceClient();

    // Get current balance
    const { data: existing } = await service
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("customer_id", testCustomerId)
      .order("created_at", { ascending: false })
      .limit(1);

    const currentBalance = existing && existing.length > 0 ? (existing[0]!.balance_after ?? 0) : 0;

    const { data: txn, error } = await service
      .from("loyalty_transactions")
      .insert({
        customer_id: testCustomerId,
        points: 150,
        type: "earn",
        reference_type: "order",
        balance_after: currentBalance + 150,
      })
      .select("id, points, type, balance_after")
      .single();

    expect(error).toBeNull();
    expect(txn).not.toBeNull();
    expect(txn!.points).toBe(150);
    expect(txn!.type).toBe("earn");
    expect(txn!.balance_after).toBe(currentBalance + 150);
    createdTransactionIds.push(txn!.id);
  });

  it("customer balance reflects the new transaction", async () => {
    const service = createServiceClient();

    const { data: latest, error } = await service
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("customer_id", testCustomerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(latest).not.toBeNull();
    // Balance should include the 150 points we just added
    expect(latest!.balance_after).toBeGreaterThanOrEqual(150);
  });
});
