import { describe, it, expect } from "vitest";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemsSchema,
} from "./order";

// ===== Helper Factories =====

function validDineInOrder() {
  return {
    table_id: 1,
    type: "dine_in" as const,
    guest_count: 4,
    items: [{ menu_item_id: 1, quantity: 2 }],
  };
}

function validTakeawayOrder() {
  return {
    type: "takeaway" as const,
    items: [{ menu_item_id: 1, quantity: 1 }],
  };
}

function validDeliveryOrder() {
  return {
    type: "delivery" as const,
    items: [{ menu_item_id: 5, quantity: 3 }],
  };
}

// ===== createOrderSchema =====

describe("createOrderSchema", () => {
  describe("valid inputs", () => {
    it("parses a valid dine_in order", () => {
      const result = createOrderSchema.safeParse(validDineInOrder());
      expect(result.success).toBe(true);
    });

    it("parses a valid takeaway order without table_id", () => {
      const result = createOrderSchema.safeParse(validTakeawayOrder());
      expect(result.success).toBe(true);
    });

    it("parses a valid delivery order", () => {
      const result = createOrderSchema.safeParse(validDeliveryOrder());
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const data = { ...validTakeawayOrder(), notes: "Extra spicy please" };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts items with modifiers", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            modifiers: [{ name: "Extra sauce", price: 5000 }],
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts items with variant_id", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [{ menu_item_id: 1, variant_id: 3, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts items with side_items", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            side_items: [{ menu_item_id: 10, quantity: 1 }],
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts items with notes", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [{ menu_item_id: 1, quantity: 1, notes: "No onion" }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts null for optional fields", () => {
      const data = {
        type: "takeaway" as const,
        table_id: null,
        guest_count: null,
        notes: null,
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            variant_id: null,
            modifiers: null,
            notes: null,
            side_items: null,
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("dine_in validation (superRefine)", () => {
    it("rejects dine_in without table_id", () => {
      const data = {
        type: "dine_in" as const,
        guest_count: 2,
        items: [{ menu_item_id: 1, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const tableIssue = result.error.issues.find(
          (i) => i.path.includes("table_id"),
        );
        expect(tableIssue).toBeDefined();
      }
    });

    it("rejects dine_in without guest_count", () => {
      const data = {
        type: "dine_in" as const,
        table_id: 1,
        items: [{ menu_item_id: 1, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const guestIssue = result.error.issues.find(
          (i) => i.path.includes("guest_count"),
        );
        expect(guestIssue).toBeDefined();
      }
    });

    it("rejects dine_in missing both table_id and guest_count", () => {
      const data = {
        type: "dine_in" as const,
        items: [{ menu_item_id: 1, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("does NOT require table_id for takeaway", () => {
      const result = createOrderSchema.safeParse(validTakeawayOrder());
      expect(result.success).toBe(true);
    });

    it("does NOT require guest_count for delivery", () => {
      const result = createOrderSchema.safeParse(validDeliveryOrder());
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty items array", () => {
      const data = { type: "takeaway" as const, items: [] };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing items field", () => {
      const result = createOrderSchema.safeParse({ type: "takeaway" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid order type", () => {
      const data = {
        type: "drive_through",
        items: [{ menu_item_id: 1, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: 1, quantity: 0 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: 1, quantity: -1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects quantity over 99", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: 1, quantity: 100 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer quantity", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: 1, quantity: 1.5 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero menu_item_id", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: 0, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects negative menu_item_id", () => {
      const data = {
        type: "takeaway" as const,
        items: [{ menu_item_id: -5, quantity: 1 }],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects notes exceeding 500 chars", () => {
      const data = {
        ...validTakeawayOrder(),
        notes: "x".repeat(501),
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects guest_count over 20", () => {
      const data = {
        ...validDineInOrder(),
        guest_count: 21,
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero guest_count", () => {
      const data = {
        ...validDineInOrder(),
        guest_count: 0,
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects negative modifier price", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            modifiers: [{ name: "Sauce", price: -1000 }],
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects item notes exceeding 200 chars", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            notes: "x".repeat(201),
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects side_item with zero quantity", () => {
      const data = {
        ...validTakeawayOrder(),
        items: [
          {
            menu_item_id: 1,
            quantity: 1,
            side_items: [{ menu_item_id: 10, quantity: 0 }],
          },
        ],
      };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ===== updateOrderStatusSchema =====

describe("updateOrderStatusSchema", () => {
  it("parses valid status update", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 42,
      status: "confirmed",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional reason", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 1,
      status: "cancelled",
      reason: "Customer changed mind",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    const validStatuses = [
      "confirmed",
      "preparing",
      "ready",
      "served",
      "completed",
      "cancelled",
    ];
    for (const status of validStatuses) {
      const result = updateOrderStatusSchema.safeParse({
        order_id: 1,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects draft as a target status", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 1,
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 1,
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero order_id", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 0,
      status: "confirmed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative order_id", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: -1,
      status: "confirmed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer order_id", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 1.5,
      status: "confirmed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing order_id", () => {
    const result = updateOrderStatusSchema.safeParse({
      status: "confirmed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reason exceeding 500 chars", () => {
    const result = updateOrderStatusSchema.safeParse({
      order_id: 1,
      status: "cancelled",
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ===== addOrderItemsSchema =====

describe("addOrderItemsSchema", () => {
  it("parses valid add items input", () => {
    const result = addOrderItemsSchema.safeParse({
      order_id: 10,
      items: [{ menu_item_id: 3, quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple items", () => {
    const result = addOrderItemsSchema.safeParse({
      order_id: 10,
      items: [
        { menu_item_id: 1, quantity: 1 },
        { menu_item_id: 2, quantity: 3 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = addOrderItemsSchema.safeParse({
      order_id: 10,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing order_id", () => {
    const result = addOrderItemsSchema.safeParse({
      items: [{ menu_item_id: 1, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero order_id", () => {
    const result = addOrderItemsSchema.safeParse({
      order_id: 0,
      items: [{ menu_item_id: 1, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });
});
