import { describe, it, expect } from "vitest";
import { processPaymentSchema } from "./payment";

describe("processPaymentSchema", () => {
  describe("valid inputs", () => {
    it("parses valid cash payment with amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: 100000,
      });
      expect(result.success).toBe(true);
    });

    it("parses valid QR payment without amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "qr",
      });
      expect(result.success).toBe(true);
    });

    it("parses QR payment with amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "qr",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(true);
    });

    it("defaults tip to 0", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "qr",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tip).toBe(0);
      }
    });

    it("accepts explicit tip value", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: 100000,
        tip: 10000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tip).toBe(10000);
      }
    });

    it("accepts zero tip", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: 50000,
        tip: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts large amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: 99999999,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("cash payment refinement", () => {
    it("rejects cash payment without amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const amountIssue = result.error.issues.find((i) => i.path.includes("amount_tendered"));
        expect(amountIssue).toBeDefined();
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing order_id", () => {
      const result = processPaymentSchema.safeParse({
        method: "cash",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero order_id", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 0,
        method: "cash",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative order_id", () => {
      const result = processPaymentSchema.safeParse({
        order_id: -1,
        method: "cash",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer order_id", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1.5,
        method: "cash",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid payment method", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "card",
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects ewallet as method", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "ewallet",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative tip", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: 50000,
        tip: -1000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing method", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        amount_tendered: 50000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects string amount_tendered", () => {
      const result = processPaymentSchema.safeParse({
        order_id: 1,
        method: "cash",
        amount_tendered: "50000",
      });
      expect(result.success).toBe(false);
    });
  });
});
