import { describe, it, expect } from "vitest";
import {
  registerTerminalSchema,
  openSessionSchema,
  closeSessionSchema,
} from "./pos";

// ===== registerTerminalSchema =====

describe("registerTerminalSchema", () => {
  function validTerminal() {
    return {
      branch_id: 1,
      name: "Cashier 1",
      type: "cashier_station" as const,
      device_fingerprint: "abc123xyz",
    };
  }

  describe("valid inputs", () => {
    it("parses valid cashier_station terminal", () => {
      const result = registerTerminalSchema.safeParse(validTerminal());
      expect(result.success).toBe(true);
    });

    it("parses valid mobile_order terminal", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        type: "mobile_order",
        name: "Waiter Tablet 1",
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional peripheral_config", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        peripheral_config: { printer: "usb", drawer: true },
      });
      expect(result.success).toBe(true);
    });

    it("accepts terminal without peripheral_config", () => {
      const result = registerTerminalSchema.safeParse(validTerminal());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.peripheral_config).toBeUndefined();
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty name", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 chars", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid terminal type", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        type: "kds_station",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero branch_id", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        branch_id: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative branch_id", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        branch_id: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer branch_id", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        branch_id: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty device_fingerprint", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        device_fingerprint: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects device_fingerprint exceeding 255 chars", () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal(),
        device_fingerprint: "x".repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing branch_id", () => {
      const { branch_id, ...rest } = validTerminal();
      const result = registerTerminalSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects missing name", () => {
      const { name, ...rest } = validTerminal();
      const result = registerTerminalSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects missing type", () => {
      const { type, ...rest } = validTerminal();
      const result = registerTerminalSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects missing device_fingerprint", () => {
      const { device_fingerprint, ...rest } = validTerminal();
      const result = registerTerminalSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

// ===== openSessionSchema =====

describe("openSessionSchema", () => {
  describe("valid inputs", () => {
    it("parses valid open session data", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
        opening_amount: 500000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts zero opening_amount", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
        opening_amount: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts large opening_amount", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
        opening_amount: 10000000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects negative opening_amount", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
        opening_amount: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero terminal_id", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 0,
        opening_amount: 500000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative terminal_id", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: -1,
        opening_amount: 500000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer terminal_id", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1.5,
        opening_amount: 500000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing terminal_id", () => {
      const result = openSessionSchema.safeParse({
        opening_amount: 500000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing opening_amount", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects string opening_amount", () => {
      const result = openSessionSchema.safeParse({
        terminal_id: 1,
        opening_amount: "500000",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ===== closeSessionSchema =====

describe("closeSessionSchema", () => {
  describe("valid inputs", () => {
    it("parses valid close session data", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: 1500000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts zero closing_amount", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: 1000000,
        notes: "End of shift, all good",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string notes (undefined behavior preserved)", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: 1000000,
        notes: "",
      });
      // Empty string is a valid string
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects negative closing_amount", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero session_id", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 0,
        closing_amount: 1000000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative session_id", () => {
      const result = closeSessionSchema.safeParse({
        session_id: -1,
        closing_amount: 1000000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer session_id", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1.5,
        closing_amount: 1000000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing session_id", () => {
      const result = closeSessionSchema.safeParse({
        closing_amount: 1000000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing closing_amount", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects notes exceeding 500 chars", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: 1000000,
        notes: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects string closing_amount", () => {
      const result = closeSessionSchema.safeParse({
        session_id: 1,
        closing_amount: "1000000",
      });
      expect(result.success).toBe(false);
    });
  });
});
