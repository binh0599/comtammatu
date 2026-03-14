import { describe, it, expect } from "vitest";
import {
  VALID_ORDER_TRANSITIONS,
  VALID_KDS_TRANSITIONS,
  VALID_PO_TRANSITIONS,
  ORDER_STATUSES,
  ORDER_ITEM_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TABLE_STATUSES,
  STAFF_ROLES,
  POS_ROLES,
  CASHIER_ROLES,
  KDS_ROLES,
  STOCK_MOVEMENT_TYPES,
  PO_STATUSES,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  LEAVE_TYPES,
  LEAVE_STATUSES,
  VOUCHER_TYPES,
  CUSTOMER_GENDERS,
  DISCOUNT_TYPES,
} from "../constants";

// ===== Enum Arrays =====

describe("Status enum arrays", () => {
  it("ORDER_STATUSES contains expected values", () => {
    expect(ORDER_STATUSES).toContain("draft");
    expect(ORDER_STATUSES).toContain("completed");
    expect(ORDER_STATUSES).toContain("cancelled");
    expect(ORDER_STATUSES.length).toBe(7);
  });

  it("ORDER_ITEM_STATUSES contains expected values", () => {
    expect(ORDER_ITEM_STATUSES).toContain("pending");
    expect(ORDER_ITEM_STATUSES).toContain("sent_to_kds");
    expect(ORDER_ITEM_STATUSES.length).toBe(6);
  });

  it("ORDER_TYPES has 3 items", () => {
    expect(ORDER_TYPES).toEqual(["dine_in", "takeaway", "delivery"]);
  });

  it("PAYMENT_METHODS has 5 items", () => {
    expect(PAYMENT_METHODS).toEqual(["cash", "card", "ewallet", "qr", "transfer"]);
  });

  it("PAYMENT_STATUSES has 5 items", () => {
    expect(PAYMENT_STATUSES.length).toBe(5);
    expect(PAYMENT_STATUSES).toContain("expired");
  });

  it("TABLE_STATUSES has 4 items", () => {
    expect(TABLE_STATUSES.length).toBe(4);
  });

  it("STAFF_ROLES includes all known roles", () => {
    expect(STAFF_ROLES).toContain("owner");
    expect(STAFF_ROLES).toContain("waiter");
    expect(STAFF_ROLES).toContain("hr");
    expect(STAFF_ROLES.length).toBe(7);
  });

  it("POS_ROLES is a subset of STAFF_ROLES", () => {
    for (const role of POS_ROLES) {
      expect(STAFF_ROLES).toContain(role);
    }
  });

  it("CASHIER_ROLES is a subset of STAFF_ROLES", () => {
    for (const role of CASHIER_ROLES) {
      expect(STAFF_ROLES).toContain(role);
    }
  });

  it("KDS_ROLES is a subset of STAFF_ROLES", () => {
    for (const role of KDS_ROLES) {
      expect(STAFF_ROLES).toContain(role);
    }
  });

  it("STOCK_MOVEMENT_TYPES has 5 items", () => {
    expect(STOCK_MOVEMENT_TYPES.length).toBe(5);
  });

  it("EMPLOYMENT_TYPES has 3 items", () => {
    expect(EMPLOYMENT_TYPES).toEqual(["full", "part", "contract"]);
  });

  it("EMPLOYEE_STATUSES has 4 items", () => {
    expect(EMPLOYEE_STATUSES.length).toBe(4);
  });

  it("LEAVE_TYPES has 4 items", () => {
    expect(LEAVE_TYPES.length).toBe(4);
  });

  it("LEAVE_STATUSES has 3 items", () => {
    expect(LEAVE_STATUSES).toEqual(["pending", "approved", "rejected"]);
  });

  it("VOUCHER_TYPES has 3 items", () => {
    expect(VOUCHER_TYPES).toEqual(["percent", "fixed", "free_item"]);
  });

  it("CUSTOMER_GENDERS has 3 items", () => {
    expect(CUSTOMER_GENDERS).toEqual(["M", "F", "Other"]);
  });

  it("DISCOUNT_TYPES has 3 items", () => {
    expect(DISCOUNT_TYPES).toEqual(["percent", "fixed", "voucher"]);
  });
});

// ===== State Transitions =====

describe("VALID_ORDER_TRANSITIONS", () => {
  it("allows draft → confirmed", () => {
    expect(VALID_ORDER_TRANSITIONS.draft).toContain("confirmed");
  });

  it("allows draft → cancelled", () => {
    expect(VALID_ORDER_TRANSITIONS.draft).toContain("cancelled");
  });

  it("does not allow completed → anything", () => {
    expect(VALID_ORDER_TRANSITIONS.completed).toEqual([]);
  });

  it("does not allow cancelled → anything", () => {
    expect(VALID_ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it("covers all order statuses", () => {
    for (const status of ORDER_STATUSES) {
      expect(VALID_ORDER_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("all transition targets are valid statuses", () => {
    for (const targets of Object.values(VALID_ORDER_TRANSITIONS)) {
      for (const t of targets) {
        expect(ORDER_STATUSES).toContain(t);
      }
    }
  });
});

describe("VALID_KDS_TRANSITIONS", () => {
  it("allows pending → preparing", () => {
    expect(VALID_KDS_TRANSITIONS.pending).toContain("preparing");
  });

  it("allows preparing → ready", () => {
    expect(VALID_KDS_TRANSITIONS.preparing).toContain("ready");
  });

  it("does not allow ready → anything", () => {
    expect(VALID_KDS_TRANSITIONS.ready).toEqual([]);
  });
});

describe("VALID_PO_TRANSITIONS", () => {
  it("allows draft → sent", () => {
    expect(VALID_PO_TRANSITIONS.draft).toContain("sent");
  });

  it("allows sent → received", () => {
    expect(VALID_PO_TRANSITIONS.sent).toContain("received");
  });

  it("does not allow received → anything", () => {
    expect(VALID_PO_TRANSITIONS.received).toEqual([]);
  });

  it("covers all PO statuses", () => {
    for (const status of PO_STATUSES) {
      expect(VALID_PO_TRANSITIONS).toHaveProperty(status);
    }
  });
});
