/**
 * Payment Processing Integration Tests
 *
 * Tests payment insertion and validation against real POS sessions.
 */

import {
  createAuthClient,
  createServiceClient,
  cleanupRows,
  SEED,
} from "./helpers";
import { randomUUID } from "crypto";

describe("Payment Processing", () => {
  const createdOrderIds: number[] = [];
  const createdPaymentIds: number[] = [];

  afterAll(async () => {
    await cleanupRows("payments", createdPaymentIds);
    await cleanupRows("orders", createdOrderIds);
  });

  let cashierTerminalId: number;
  let sessionId: number;

  it("cashier has an active POS session", async () => {
    const service = createServiceClient();

    const { data: sessions, error } = await service
      .from("pos_sessions")
      .select("id, branch_id, terminal_id, status, cashier_id")
      .eq("branch_id", SEED.branchQ1)
      .eq("status", "open")
      .limit(1);

    expect(error).toBeNull();
    expect(sessions).not.toBeNull();
    expect(sessions!.length).toBeGreaterThan(0);

    sessionId = sessions![0]!.id;
    cashierTerminalId = sessions![0]!.terminal_id;
  });

  it("payment methods are available via payment constraint", async () => {
    // The method CHECK constraint defines: cash, card, ewallet, qr, transfer
    // Verify by attempting to read existing payments
    const service = createServiceClient();
    const { data, error } = await service
      .from("payments")
      .select("id, method")
      .eq("terminal_id", cashierTerminalId)
      .limit(5);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("inserts a cash payment for a test order", async () => {
    const service = createServiceClient();

    // Create a test order first
    const { data: waiterProfile } = await service
      .from("profiles")
      .select("id")
      .eq("role", "waiter")
      .eq("tenant_id", SEED.tenantId)
      .limit(1)
      .single();

    const { data: terminal } = await service
      .from("pos_terminals")
      .select("id")
      .eq("branch_id", SEED.branchQ1)
      .eq("is_active", true)
      .limit(1)
      .single();

    const { data: order, error: orderErr } = await service
      .from("orders")
      .insert({
        order_number: `[TEST]-PAY-${Date.now()}`,
        branch_id: SEED.branchQ1,
        terminal_id: terminal!.id,
        type: "dine_in",
        status: "ready",
        subtotal: 75000,
        total: 75000,
        created_by: waiterProfile!.id,
        idempotency_key: randomUUID(),
      })
      .select("id")
      .single();

    expect(orderErr).toBeNull();
    createdOrderIds.push(order!.id);

    // Insert payment
    const { data: payment, error: payErr } = await service
      .from("payments")
      .insert({
        order_id: order!.id,
        pos_session_id: sessionId,
        terminal_id: cashierTerminalId,
        method: "cash",
        amount: 75000,
        tip: 5000,
        status: "completed",
        paid_at: new Date().toISOString(),
        idempotency_key: randomUUID(),
      })
      .select("id, amount, tip, method, status")
      .single();

    expect(payErr).toBeNull();
    expect(payment).not.toBeNull();
    expect(payment!.amount).toBe(75000);
    expect(payment!.tip).toBe(5000);
    expect(payment!.method).toBe("cash");
    expect(payment!.status).toBe("completed");
    createdPaymentIds.push(payment!.id);
  });

  it("payment record persists with correct data", async () => {
    const service = createServiceClient();
    const paymentId = createdPaymentIds[0]!;

    const { data: payment, error } = await service
      .from("payments")
      .select("id, order_id, amount, tip, method, status, paid_at")
      .eq("id", paymentId)
      .single();

    expect(error).toBeNull();
    expect(payment).not.toBeNull();
    expect(payment!.amount).toBe(75000);
    expect(payment!.tip).toBe(5000);
    expect(payment!.paid_at).not.toBeNull();
  });
});
