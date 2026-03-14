/**
 * Order Lifecycle Integration Tests
 *
 * Tests the full order flow: creation -> status updates -> payment -> completion.
 */

import { createAuthClient, createServiceClient, cleanupRows, SEED } from "./helpers";
import { randomUUID } from "crypto";

describe("Order Lifecycle", () => {
  const createdOrderIds: number[] = [];
  const createdOrderItemIds: number[] = [];
  const createdPaymentIds: number[] = [];

  afterAll(async () => {
    // Clean up in reverse dependency order
    await cleanupRows("payments", createdPaymentIds);
    await cleanupRows("order_items", createdOrderItemIds);
    await cleanupRows("orders", createdOrderIds);
  });

  it("waiter creates an order with items", async () => {
    const waiter = await createAuthClient("waiter");
    const { data: authData } = await waiter.auth.getUser();
    const userId = authData.user!.id;

    // Need a terminal — find an existing one for branchQ1
    const service = createServiceClient();
    const { data: terminals } = await service
      .from("pos_terminals")
      .select("id")
      .eq("branch_id", SEED.branchQ1)
      .eq("is_active", true)
      .limit(1);

    expect(terminals).not.toBeNull();
    expect(terminals!.length).toBeGreaterThan(0);
    const terminalId = terminals![0]!.id;

    // Insert order
    const { data: order, error: orderErr } = await waiter
      .from("orders")
      .insert({
        order_number: `[TEST]-${Date.now()}`,
        branch_id: SEED.branchQ1,
        terminal_id: terminalId,
        type: "dine_in",
        status: "draft",
        subtotal: 100000,
        total: 100000,
        created_by: userId,
        idempotency_key: randomUUID(),
      })
      .select("id, order_number, status")
      .single();

    expect(orderErr).toBeNull();
    expect(order).not.toBeNull();
    createdOrderIds.push(order!.id);

    // Insert order item using known menu_item_id=1
    const { data: item, error: itemErr } = await waiter
      .from("order_items")
      .insert({
        order_id: order!.id,
        menu_item_id: 1,
        quantity: 2,
        unit_price: 50000,
        item_total: 100000,
      })
      .select("id")
      .single();

    expect(itemErr).toBeNull();
    expect(item).not.toBeNull();
    createdOrderItemIds.push(item!.id);
  });

  it("order appears in the tenant's order list", async () => {
    const waiter = await createAuthClient("waiter");
    const { data: orders, error } = await waiter
      .from("orders")
      .select("id, order_number")
      .in("id", createdOrderIds);

    expect(error).toBeNull();
    expect(orders).not.toBeNull();
    expect(orders!.length).toBe(1);
  });

  it("order status can be updated through lifecycle", async () => {
    const service = createServiceClient();
    const orderId = createdOrderIds[0]!;

    // draft → confirmed
    const { error: e1 } = await service
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);
    expect(e1).toBeNull();

    // confirmed → preparing
    const { error: e2 } = await service
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", orderId);
    expect(e2).toBeNull();

    // preparing → ready
    const { error: e3 } = await service
      .from("orders")
      .update({ status: "ready" })
      .eq("id", orderId);
    expect(e3).toBeNull();

    const { data: updated } = await service
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    expect(updated!.status).toBe("ready");
  });

  it("cashier processes payment and completes order", async () => {
    const service = createServiceClient();
    const orderId = createdOrderIds[0]!;

    // Find a cashier_station terminal and open session
    const { data: cashierTerminals } = await service
      .from("pos_terminals")
      .select("id")
      .eq("branch_id", SEED.branchQ1)
      .eq("type", "cashier_station")
      .eq("is_active", true)
      .limit(1);

    expect(cashierTerminals!.length).toBeGreaterThan(0);
    const cashierTerminalId = cashierTerminals![0]!.id;

    // Find an open POS session
    const { data: sessions } = await service
      .from("pos_sessions")
      .select("id")
      .eq("branch_id", SEED.branchQ1)
      .eq("status", "open")
      .limit(1);

    expect(sessions!.length).toBeGreaterThan(0);
    const sessionId = sessions![0]!.id;

    // Insert payment
    const { data: payment, error: payErr } = await service
      .from("payments")
      .insert({
        order_id: orderId,
        pos_session_id: sessionId,
        terminal_id: cashierTerminalId,
        method: "cash",
        amount: 100000,
        tip: 0,
        status: "completed",
        paid_at: new Date().toISOString(),
        idempotency_key: randomUUID(),
      })
      .select("id, status")
      .single();

    expect(payErr).toBeNull();
    expect(payment!.status).toBe("completed");
    createdPaymentIds.push(payment!.id);

    // Mark order completed
    const { error: completeErr } = await service
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    expect(completeErr).toBeNull();

    const { data: finalOrder } = await service
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    expect(finalOrder!.status).toBe("completed");
  });
});
