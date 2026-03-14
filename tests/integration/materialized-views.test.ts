/**
 * Materialized Views Integration Tests
 *
 * Tests CQRS materialized views return data and support branch filtering.
 */

import { createServiceClient, SEED } from "./helpers";

describe("Materialized Views", () => {
  const service = createServiceClient();

  describe("mv_daily_revenue", () => {
    it("returns revenue data for known branch", async () => {
      const { data, error } = await service
        .from("mv_daily_revenue")
        .select("branch_id, report_date, order_count, total_revenue, avg_ticket")
        .eq("branch_id", SEED.branchQ1)
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      // MV may be empty if no completed orders exist, but query should succeed
    });

    it("supports filtering by branch_id", async () => {
      const { data, error } = await service
        .from("mv_daily_revenue")
        .select("branch_id")
        .eq("branch_id", SEED.branchQ3)
        .limit(5);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      if (data!.length > 0) {
        expect(data!.every((r) => r.branch_id === SEED.branchQ3)).toBe(true);
      }
    });
  });

  describe("mv_item_popularity", () => {
    it("returns item popularity data with quantities", async () => {
      const { data, error } = await service
        .from("mv_item_popularity")
        .select("branch_id, report_date, menu_item_id, item_name, total_quantity, total_revenue")
        .eq("branch_id", SEED.branchQ1)
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      if (data!.length > 0) {
        expect(data![0]!.item_name).toBeDefined();
        expect(data![0]!.total_quantity).toBeGreaterThan(0);
      }
    });

    it("respects branch_id filtering", async () => {
      const { data, error } = await service
        .from("mv_item_popularity")
        .select("branch_id")
        .eq("branch_id", SEED.branchQ1)
        .limit(5);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data.every((r) => r.branch_id === SEED.branchQ1)).toBe(true);
      }
    });
  });

  describe("mv_peak_hours", () => {
    it("returns day-of-week and hour data", async () => {
      const { data, error } = await service
        .from("mv_peak_hours")
        .select("branch_id, day_of_week, hour_of_day, order_count")
        .eq("branch_id", SEED.branchQ1)
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      if (data!.length > 0) {
        const row = data![0]!;
        expect(row.day_of_week).toBeGreaterThanOrEqual(0);
        expect(row.day_of_week).toBeLessThanOrEqual(6);
        expect(row.hour_of_day).toBeGreaterThanOrEqual(6);
        expect(row.hour_of_day).toBeLessThanOrEqual(23);
        expect(row.order_count).toBeGreaterThan(0);
      }
    });

    it("respects branch_id filtering", async () => {
      const { data, error } = await service
        .from("mv_peak_hours")
        .select("branch_id")
        .eq("branch_id", SEED.branchQ3)
        .limit(5);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data.every((r) => r.branch_id === SEED.branchQ3)).toBe(true);
      }
    });
  });

  describe("mv_staff_performance", () => {
    it("returns staff performance stats", async () => {
      const { data, error } = await service
        .from("mv_staff_performance")
        .select("profile_id, report_date, orders_created, total_items_served, payments_processed")
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      if (data!.length > 0) {
        const row = data![0]!;
        expect(row.profile_id).toBeDefined();
        expect(row.orders_created).toBeGreaterThanOrEqual(0);
        expect(row.payments_processed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("mv_daily_payment_methods", () => {
    it("returns payment method breakdown", async () => {
      const { data, error } = await service
        .from("mv_daily_payment_methods")
        .select("branch_id, report_date, method, payment_count, method_total")
        .eq("branch_id", SEED.branchQ1)
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
  });

  describe("mv_inventory_usage", () => {
    it("returns ingredient usage data per branch", async () => {
      const { data, error } = await service
        .from("mv_inventory_usage")
        .select("branch_id, report_date, ingredient_id, total_usage")
        .eq("branch_id", SEED.branchQ1)
        .limit(10);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
  });
});
