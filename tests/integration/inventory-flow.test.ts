/**
 * Inventory Flow Integration Tests
 *
 * Tests purchase order workflow: creation -> status transitions -> stock updates.
 */

import { createAuthClient, createServiceClient, cleanupRows, SEED } from "./helpers";

describe("Inventory Flow", () => {
  const createdPOIds: number[] = [];
  const createdPOItemIds: number[] = [];

  afterAll(async () => {
    await cleanupRows("purchase_order_items", createdPOItemIds);
    await cleanupRows("purchase_orders", createdPOIds);
  });

  let supplierId: number;
  let ingredientId: number;

  it("finds existing supplier and ingredient for the tenant", async () => {
    const service = createServiceClient();

    const { data: suppliers } = await service
      .from("suppliers")
      .select("id")
      .eq("tenant_id", SEED.tenantId)
      .eq("is_active", true)
      .limit(1);

    // If no suppliers exist, create one for testing
    if (!suppliers || suppliers.length === 0) {
      const { data: newSupplier } = await service
        .from("suppliers")
        .insert({
          tenant_id: SEED.tenantId,
          name: "[TEST] Nhà cung cấp thử nghiệm",
          is_active: true,
        })
        .select("id")
        .single();
      supplierId = newSupplier!.id;
    } else {
      supplierId = suppliers[0]!.id;
    }

    const { data: ingredients } = await service
      .from("ingredients")
      .select("id")
      .eq("tenant_id", SEED.tenantId)
      .eq("is_active", true)
      .limit(1);

    if (!ingredients || ingredients.length === 0) {
      const { data: newIng } = await service
        .from("ingredients")
        .insert({
          tenant_id: SEED.tenantId,
          name: "[TEST] Nguyên liệu thử nghiệm",
          unit: "kg",
          is_active: true,
        })
        .select("id")
        .single();
      ingredientId = newIng!.id;
    } else {
      ingredientId = ingredients[0]!.id;
    }

    expect(supplierId).toBeDefined();
    expect(ingredientId).toBeDefined();
  });

  it("manager creates a purchase order with items", async () => {
    const manager = await createAuthClient("manager");
    const { data: authData } = await manager.auth.getUser();
    const userId = authData.user!.id;

    const { data: po, error: poErr } = await manager
      .from("purchase_orders")
      .insert({
        tenant_id: SEED.tenantId,
        supplier_id: supplierId,
        branch_id: SEED.branchQ1,
        status: "draft",
        total: 500000,
        created_by: userId,
        notes: "[TEST] Đơn hàng thử nghiệm",
      })
      .select("id, status")
      .single();

    expect(poErr).toBeNull();
    expect(po).not.toBeNull();
    expect(po!.status).toBe("draft");
    createdPOIds.push(po!.id);

    const { data: poItem, error: itemErr } = await manager
      .from("purchase_order_items")
      .insert({
        po_id: po!.id,
        ingredient_id: ingredientId,
        quantity: 10,
        unit_price: 50000,
      })
      .select("id")
      .single();

    expect(itemErr).toBeNull();
    createdPOItemIds.push(poItem!.id);
  });

  it("PO status transitions: draft → sent → received", async () => {
    const service = createServiceClient();
    const poId = createdPOIds[0]!;

    // draft → sent
    const { error: e1 } = await service
      .from("purchase_orders")
      .update({ status: "sent", ordered_at: new Date().toISOString() })
      .eq("id", poId);
    expect(e1).toBeNull();

    // sent → received
    const { error: e2 } = await service
      .from("purchase_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", poId);
    expect(e2).toBeNull();

    // Update received_qty on PO item
    const { error: e3 } = await service
      .from("purchase_order_items")
      .update({ received_qty: 10 })
      .eq("po_id", poId);
    expect(e3).toBeNull();

    const { data: finalPO } = await service
      .from("purchase_orders")
      .select("status")
      .eq("id", poId)
      .single();

    expect(finalPO!.status).toBe("received");
  });

  it("stock levels table is accessible for the branch", async () => {
    const service = createServiceClient();
    const { data: stockRows, error } = await service
      .from("stock_levels")
      .select("id, ingredient_id, branch_id, quantity")
      .eq("branch_id", SEED.branchQ1)
      .limit(5);

    expect(error).toBeNull();
    // Stock levels may or may not exist; we just verify the query works
    expect(stockRows).not.toBeNull();
  });
});
