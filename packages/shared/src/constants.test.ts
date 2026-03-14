import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  TERMINAL_TYPES,
  TABLE_STATUSES,
  STAFF_ROLES,
  POS_ROLES,
  CASHIER_ROLES,
  KDS_ROLES,
  VALID_ORDER_TRANSITIONS,
  VALID_KDS_TRANSITIONS,
  KDS_TICKET_STATUSES,
  ROLE_REDIRECT_MAP,
} from "./constants";

describe("ORDER_STATUSES", () => {
  it("có đầy đủ trạng thái", () => {
    expect(ORDER_STATUSES).toContain("draft");
    expect(ORDER_STATUSES).toContain("confirmed");
    expect(ORDER_STATUSES).toContain("preparing");
    expect(ORDER_STATUSES).toContain("ready");
    expect(ORDER_STATUSES).toContain("served");
    expect(ORDER_STATUSES).toContain("completed");
    expect(ORDER_STATUSES).toContain("cancelled");
  });

  it("có đúng 7 trạng thái", () => {
    expect(ORDER_STATUSES.length).toBe(7);
  });
});

describe("VALID_ORDER_TRANSITIONS", () => {
  it("draft chỉ chuyển sang confirmed hoặc cancelled", () => {
    expect(VALID_ORDER_TRANSITIONS.draft).toEqual(["confirmed", "cancelled"]);
  });

  it("completed không chuyển sang trạng thái nào", () => {
    expect(VALID_ORDER_TRANSITIONS.completed).toEqual([]);
  });

  it("cancelled không chuyển sang trạng thái nào", () => {
    expect(VALID_ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it("mỗi trạng thái đều có entry trong transitions", () => {
    for (const status of ORDER_STATUSES) {
      expect(VALID_ORDER_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("tất cả target transitions đều là ORDER_STATUSES hợp lệ", () => {
    for (const targets of Object.values(VALID_ORDER_TRANSITIONS)) {
      for (const target of targets) {
        expect(ORDER_STATUSES).toContain(target);
      }
    }
  });
});

describe("VALID_KDS_TRANSITIONS", () => {
  it("pending chuyển sang preparing hoặc ready", () => {
    expect(VALID_KDS_TRANSITIONS.pending).toEqual(["preparing", "ready"]);
  });

  it("preparing chỉ chuyển sang ready", () => {
    expect(VALID_KDS_TRANSITIONS.preparing).toEqual(["ready"]);
  });

  it("ready không chuyển sang trạng thái nào", () => {
    expect(VALID_KDS_TRANSITIONS.ready).toEqual([]);
  });

  it("mỗi KDS status đều có transition entry", () => {
    for (const status of KDS_TICKET_STATUSES) {
      expect(VALID_KDS_TRANSITIONS).toHaveProperty(status);
    }
  });
});

describe("Role constants", () => {
  it("STAFF_ROLES bao gồm tất cả vai trò nhân viên", () => {
    expect(STAFF_ROLES).toContain("owner");
    expect(STAFF_ROLES).toContain("manager");
    expect(STAFF_ROLES).toContain("cashier");
    expect(STAFF_ROLES).toContain("chef");
    expect(STAFF_ROLES).toContain("waiter");
  });

  it("POS_ROLES là subset của STAFF_ROLES", () => {
    for (const role of POS_ROLES) {
      expect(STAFF_ROLES).toContain(role);
    }
  });

  it("CASHIER_ROLES là subset của POS_ROLES", () => {
    for (const role of CASHIER_ROLES) {
      expect(POS_ROLES).toContain(role);
    }
  });

  it("KDS_ROLES bao gồm chef", () => {
    expect(KDS_ROLES).toContain("chef");
  });

  it("waiter không nằm trong CASHIER_ROLES", () => {
    expect(CASHIER_ROLES).not.toContain("waiter");
  });
});

describe("ROLE_REDIRECT_MAP", () => {
  it("owner → /admin", () => {
    expect(ROLE_REDIRECT_MAP.owner).toBe("/admin");
  });

  it("cashier → /pos", () => {
    expect(ROLE_REDIRECT_MAP.cashier).toBe("/pos");
  });

  it("chef → /kds", () => {
    expect(ROLE_REDIRECT_MAP.chef).toBe("/kds");
  });
});

describe("Other constants", () => {
  it("ORDER_TYPES có 3 loại", () => {
    expect(ORDER_TYPES).toEqual(["dine_in", "takeaway", "delivery"]);
  });

  it("PAYMENT_METHODS bao gồm cash", () => {
    expect(PAYMENT_METHODS).toContain("cash");
  });

  it("TERMINAL_TYPES có mobile_order và cashier_station", () => {
    expect(TERMINAL_TYPES).toEqual(["mobile_order", "cashier_station"]);
  });

  it("TABLE_STATUSES có 4 trạng thái", () => {
    expect(TABLE_STATUSES).toEqual(["available", "occupied", "reserved", "maintenance"]);
  });
});
