import { describe, it, expect } from "vitest";
import {
    menuSchema,
    menuCategorySchema,
    menuItemSchema,
    menuItemAvailableSidesSchema,
    entityIdSchema,
} from "./menu";

describe("menuSchema", () => {
    it("chấp nhận menu hợp lệ", () => {
        const result = menuSchema.safeParse({
            name: "Thực đơn chính",
            type: "dine_in",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.is_active).toBe(true); // default
        }
    });

    it("từ chối tên trống", () => {
        const result = menuSchema.safeParse({
            name: "",
            type: "dine_in",
        });
        expect(result.success).toBe(false);
    });

    it("từ chối type không hợp lệ", () => {
        const result = menuSchema.safeParse({
            name: "Test",
            type: "invalid",
        });
        expect(result.success).toBe(false);
    });

    it("chấp nhận tất cả loại type", () => {
        for (const type of ["dine_in", "takeaway", "delivery"]) {
            const result = menuSchema.safeParse({ name: "Test", type });
            expect(result.success).toBe(true);
        }
    });
});

describe("menuCategorySchema", () => {
    it("chấp nhận danh mục hợp lệ", () => {
        const result = menuCategorySchema.safeParse({
            menu_id: 1,
            name: "Cơm tấm",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sort_order).toBe(0); // default
            expect(result.data.type).toBe("main_dish"); // default
        }
    });

    it("coerce string thành number cho menu_id", () => {
        const result = menuCategorySchema.safeParse({
            menu_id: "5",
            name: "Nước uống",
            type: "drink",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.menu_id).toBe(5);
        }
    });

    it("từ chối menu_id <= 0", () => {
        const result = menuCategorySchema.safeParse({
            menu_id: 0,
            name: "Test",
        });
        expect(result.success).toBe(false);
    });

    it("từ chối tên trống", () => {
        const result = menuCategorySchema.safeParse({
            menu_id: 1,
            name: "",
        });
        expect(result.success).toBe(false);
    });
});

describe("menuItemSchema", () => {
    it("chấp nhận món hợp lệ", () => {
        const result = menuItemSchema.safeParse({
            category_id: 1,
            name: "Cơm tấm sườn bì chả",
            base_price: 55000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.is_available).toBe(true);
        }
    });

    it("coerce string thành number cho base_price", () => {
        const result = menuItemSchema.safeParse({
            category_id: "1",
            name: "Cơm tấm bì",
            base_price: "35000",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.base_price).toBe(35000);
        }
    });

    it("từ chối giá = 0", () => {
        const result = menuItemSchema.safeParse({
            category_id: 1,
            name: "Test",
            base_price: 0,
        });
        expect(result.success).toBe(false);
    });

    it("từ chối giá âm", () => {
        const result = menuItemSchema.safeParse({
            category_id: 1,
            name: "Test",
            base_price: -1000,
        });
        expect(result.success).toBe(false);
    });

    it("từ chối tên trống", () => {
        const result = menuItemSchema.safeParse({
            category_id: 1,
            name: "",
            base_price: 10000,
        });
        expect(result.success).toBe(false);
    });
});

describe("menuItemAvailableSidesSchema", () => {
    it("chấp nhận danh sách side_item_ids hợp lệ", () => {
        const result = menuItemAvailableSidesSchema.safeParse({
            menu_item_id: 1,
            side_item_ids: [2, 3, 4],
        });
        expect(result.success).toBe(true);
    });

    it("chấp nhận danh sách rỗng (xóa tất cả sides)", () => {
        const result = menuItemAvailableSidesSchema.safeParse({
            menu_item_id: 1,
            side_item_ids: [],
        });
        expect(result.success).toBe(true);
    });
});

describe("entityIdSchema", () => {
    it("chấp nhận ID dương", () => {
        const result = entityIdSchema.safeParse(1);
        expect(result.success).toBe(true);
    });

    it("từ chối ID = 0", () => {
        const result = entityIdSchema.safeParse(0);
        expect(result.success).toBe(false);
    });

    it("từ chối số thập phân", () => {
        const result = entityIdSchema.safeParse(1.5);
        expect(result.success).toBe(false);
    });

    it("từ chối số âm", () => {
        const result = entityIdSchema.safeParse(-1);
        expect(result.success).toBe(false);
    });
});
