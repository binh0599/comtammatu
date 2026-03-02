import { describe, it, expect } from "vitest";
import {
    formatPrice,
    formatElapsedTime,
    formatDateTime,
    formatDate,
    formatTime,
    formatPoints,
    formatDiscount,
    getOrderStatusLabel,
    getPaymentMethodLabel,
    getTerminalTypeLabel,
    getTableStatusLabel,
    getStockMovementTypeLabel,
    getWasteReasonLabel,
    getPoStatusLabel,
    getEmploymentTypeLabel,
    getEmployeeStatusLabel,
    getLeaveTypeLabel,
    getLeaveStatusLabel,
    getSeverityLabel,
    getAttendanceStatusLabel,
    getShiftAssignmentStatusLabel,
    getCustomerGenderLabel,
    getCustomerSourceLabel,
    getLoyaltyTransactionTypeLabel,
    getVoucherTypeLabel,
    getDeletionStatusLabel,
    getPaymentStatusLabel,
    getDiscountTypeLabel,
} from "./format";

// ===== Formatters =====

describe("formatPrice", () => {
    it("formats zero", () => {
        expect(formatPrice(0)).toBe("0₫");
    });

    it("formats thousands with dot separator", () => {
        expect(formatPrice(45000)).toBe("45.000₫");
    });

    it("formats large amounts", () => {
        expect(formatPrice(1500000)).toBe("1.500.000₫");
    });

    it("truncates decimals", () => {
        expect(formatPrice(123.99)).toBe("124₫");
    });
});

describe("formatElapsedTime", () => {
    it("returns 'Vừa xong' for less than 60 seconds", () => {
        const now = new Date();
        expect(formatElapsedTime(now)).toBe("Vừa xong");
    });

    it("returns minutes for < 60 minutes", () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatElapsedTime(fiveMinAgo)).toBe("5 phút");
    });

    it("returns hours for >= 60 minutes", () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(formatElapsedTime(twoHoursAgo)).toBe("2 giờ");
    });

    it("returns hours and minutes", () => {
        const ago = new Date(Date.now() - (1 * 60 * 60 * 1000 + 5 * 60 * 1000));
        expect(formatElapsedTime(ago)).toBe("1 giờ 5 phút");
    });

    it("accepts string dates", () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(formatElapsedTime(fiveMinAgo)).toBe("5 phút");
    });
});

describe("formatDateTime", () => {
    it("formats a date to Vietnamese locale", () => {
        const result = formatDateTime("2026-02-28T14:30:00Z");
        expect(result).toContain("28");
        expect(result).toContain("02");
        expect(result).toContain("2026");
    });

    it("accepts Date objects", () => {
        const result = formatDateTime(new Date("2026-01-15T10:00:00Z"));
        expect(result).toContain("15");
        expect(result).toContain("01");
    });
});

describe("formatDate", () => {
    it("formats date to DD/MM/YYYY", () => {
        const result = formatDate("2026-03-01T00:00:00Z");
        expect(result).toContain("03");
        expect(result).toContain("2026");
    });
});

describe("formatTime", () => {
    it("truncates HH:mm:ss to HH:mm", () => {
        expect(formatTime("14:30:00")).toBe("14:30");
    });

    it("handles already short strings", () => {
        expect(formatTime("09:15:59")).toBe("09:15");
    });
});

describe("formatPoints", () => {
    it("formats positive points with + sign", () => {
        expect(formatPoints(150)).toContain("+");
        expect(formatPoints(150)).toContain("điểm");
    });

    it("formats negative points with - sign", () => {
        expect(formatPoints(-50)).toContain("-");
        expect(formatPoints(-50)).toContain("điểm");
    });

    it("formats zero without sign", () => {
        expect(formatPoints(0)).toContain("điểm");
    });
});

describe("formatDiscount", () => {
    it("formats percent type", () => {
        expect(formatDiscount("percent", 10)).toBe("10%");
    });

    it("formats fixed type as price", () => {
        expect(formatDiscount("fixed", 50000)).toBe("50.000₫");
    });
});

// ===== Label Mappers =====

describe("getOrderStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getOrderStatusLabel("draft")).toBe("Nháp");
        expect(getOrderStatusLabel("completed")).toBe("Hoàn tất");
        expect(getOrderStatusLabel("cancelled")).toBe("Đã huỷ");
    });

    it("returns key for unknown status", () => {
        expect(getOrderStatusLabel("unknown")).toBe("unknown");
    });
});

describe("getPaymentMethodLabel", () => {
    it("maps known methods", () => {
        expect(getPaymentMethodLabel("cash")).toBe("Tiền mặt");
        expect(getPaymentMethodLabel("qr")).toBe("QR Code");
    });

    it("returns key for unknown method", () => {
        expect(getPaymentMethodLabel("bitcoin")).toBe("bitcoin");
    });
});

describe("getTerminalTypeLabel", () => {
    it("maps known types", () => {
        expect(getTerminalTypeLabel("mobile_order")).toBe("Máy gọi món");
        expect(getTerminalTypeLabel("cashier_station")).toBe("Máy thu ngân");
    });
});

describe("getTableStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getTableStatusLabel("available")).toBe("Trống");
        expect(getTableStatusLabel("occupied")).toBe("Có khách");
    });
});

describe("getStockMovementTypeLabel", () => {
    it("maps known types", () => {
        expect(getStockMovementTypeLabel("in")).toBe("Nhập kho");
        expect(getStockMovementTypeLabel("waste")).toBe("Hao hụt");
    });
});

describe("getWasteReasonLabel", () => {
    it("maps known reasons", () => {
        expect(getWasteReasonLabel("expired")).toBe("Hết hạn");
        expect(getWasteReasonLabel("spoiled")).toBe("Hỏng");
    });
});

describe("getPoStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getPoStatusLabel("draft")).toBe("Nháp");
        expect(getPoStatusLabel("received")).toBe("Đã nhận");
    });
});

describe("getEmploymentTypeLabel", () => {
    it("maps known types", () => {
        expect(getEmploymentTypeLabel("full")).toBe("Toàn thời gian");
        expect(getEmploymentTypeLabel("part")).toBe("Bán thời gian");
    });
});

describe("getEmployeeStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getEmployeeStatusLabel("active")).toBe("Đang làm");
        expect(getEmployeeStatusLabel("terminated")).toBe("Đã nghỉ");
    });
});

describe("getLeaveTypeLabel", () => {
    it("maps known types", () => {
        expect(getLeaveTypeLabel("annual")).toBe("Phép năm");
        expect(getLeaveTypeLabel("sick")).toBe("Ốm");
    });
});

describe("getLeaveStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getLeaveStatusLabel("pending")).toBe("Chờ duyệt");
        expect(getLeaveStatusLabel("approved")).toBe("Đã duyệt");
    });
});

describe("getSeverityLabel", () => {
    it("maps known severities", () => {
        expect(getSeverityLabel("info")).toBe("Thông tin");
        expect(getSeverityLabel("critical")).toBe("Nghiêm trọng");
    });
});

describe("getAttendanceStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getAttendanceStatusLabel("present")).toBe("Có mặt");
        expect(getAttendanceStatusLabel("late")).toBe("Đi muộn");
    });
});

describe("getShiftAssignmentStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getShiftAssignmentStatusLabel("scheduled")).toBe("Đã lên lịch");
        expect(getShiftAssignmentStatusLabel("no_show")).toBe("Vắng mặt");
    });
});

describe("getCustomerGenderLabel", () => {
    it("maps known genders", () => {
        expect(getCustomerGenderLabel("M")).toBe("Nam");
        expect(getCustomerGenderLabel("F")).toBe("Nữ");
        expect(getCustomerGenderLabel("Other")).toBe("Khác");
    });
});

describe("getCustomerSourceLabel", () => {
    it("maps known sources", () => {
        expect(getCustomerSourceLabel("pos")).toBe("Tại quán");
        expect(getCustomerSourceLabel("app")).toBe("Ứng dụng");
    });
});

describe("getLoyaltyTransactionTypeLabel", () => {
    it("maps known types", () => {
        expect(getLoyaltyTransactionTypeLabel("earn")).toBe("Tích điểm");
        expect(getLoyaltyTransactionTypeLabel("redeem")).toBe("Đổi điểm");
    });
});

describe("getVoucherTypeLabel", () => {
    it("maps known types", () => {
        expect(getVoucherTypeLabel("percent")).toBe("Giảm %");
        expect(getVoucherTypeLabel("free_item")).toBe("Tặng món");
    });
});

describe("getDeletionStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getDeletionStatusLabel("pending")).toBe("Đang chờ");
        expect(getDeletionStatusLabel("completed")).toBe("Hoàn tất");
    });
});

describe("getPaymentStatusLabel", () => {
    it("maps known statuses", () => {
        expect(getPaymentStatusLabel("pending")).toBe("Chờ xử lý");
        expect(getPaymentStatusLabel("completed")).toBe("Thành công");
        expect(getPaymentStatusLabel("refunded")).toBe("Đã hoàn tiền");
    });
});

describe("getDiscountTypeLabel", () => {
    it("maps known types", () => {
        expect(getDiscountTypeLabel("percent")).toBe("Giảm %");
        expect(getDiscountTypeLabel("voucher")).toBe("Voucher");
    });
});
