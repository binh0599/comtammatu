"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDateTime } from "@comtammatu/shared";

interface ReceiptOrder {
    order_number: string;
    created_at: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    tables?: { number: number } | null;
    order_items: {
        id: number;
        quantity: number;
        unit_price: number;
        item_total: number;
        menu_items: { name: string } | null;
        menu_item_variants: { name: string } | null;
        modifiers?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }[];
    payments?: {
        amount: number;
        method: string;
    }[];
}

interface ReceiptPrinterProps {
    order: ReceiptOrder;
    cashierName?: string;
    trigger?: React.ReactNode;
    onPrintComplete?: () => void;
    autoPrint?: boolean;
}

export function ReceiptPrinter({
    order,
    cashierName = "Cashier",
    trigger,
    onPrintComplete,
    autoPrint = false,
}: ReceiptPrinterProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef,
        documentTitle: `Receipt_${order.order_number}`,
        onAfterPrint: () => {
            if (onPrintComplete) onPrintComplete();
        },
    });

    // Auto-print effect when autoPrint is true
    // We use a small timeout to ensure DOM is ready
    if (autoPrint) {
        setTimeout(() => {
            handlePrint();
        }, 500);
    }

    const paymentAmount =
        order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const change = paymentAmount > order.total ? paymentAmount - order.total : 0;

    return (
        <>
            {/* Trigger Button */}
            {trigger ? (
                <div onClick={() => handlePrint()}>{trigger}</div>
            ) : (
                <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
                    <Printer className="w-4 h-4" />
                    In hóa đơn
                </Button>
            )}

            {/* Hidden Print Content */}
            <div className="hidden">
                <div
                    ref={contentRef}
                    className="print:block bg-white text-black p-4 text-[12px] leading-tight font-mono w-[80mm] mx-auto print:m-0 print:p-0"
                >
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h1 className="text-xl font-bold mb-1 uppercase">CƠM TẤM MÁ TƯ</h1>
                        <p className="text-[10px] mb-1">123 Đường Số 1, Quận 1, TP. HCM</p>
                        <p className="text-[10px]">Hotline: 0909 123 456</p>
                    </div>

                    <div className="text-center font-bold text-lg mb-4 border-b border-black border-dashed pb-2 uppercase">
                        PHIẾU THANH TOÁN
                    </div>

                    {/* Info */}
                    <div className="mb-4 text-[10px]">
                        <div className="flex justify-between">
                            <span>Mã HĐ:</span>
                            <span className="font-bold">{order.order_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Ngày:</span>
                            <span>{formatDateTime(order.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Thu ngân:</span>
                            <span>{cashierName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Vị trí:</span>
                            <span className="font-bold">
                                {order.tables ? `Bàn ${order.tables.number}` : "Mang đi"}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-black border-dashed mb-2" />

                    {/* Items */}
                    <div className="mb-2">
                        <div className="flex justify-between font-bold mb-2">
                            <span className="w-3/5">Tên Món</span>
                            <span className="w-1/5 text-center">SL</span>
                            <span className="w-1/5 text-right">T.Tiền</span>
                        </div>
                        {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between items-start mb-2">
                                <div className="w-3/5 pr-2">
                                    <div className="font-medium">
                                        {item.menu_items?.name}
                                        {item.menu_item_variants && ` (${item.menu_item_variants.name})`}
                                    </div>
                                </div>
                                <div className="w-1/5 text-center">x{item.quantity}</div>
                                <div className="w-1/5 text-right font-medium">
                                    {formatPrice(item.item_total).replace("đ", "")}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-black border-dashed mb-2" />

                    {/* Totals */}
                    <div className="space-y-1 mb-4">
                        <div className="flex justify-between">
                            <span>Tạm tính</span>
                            <span>{formatPrice(order.subtotal).replace("đ", "")}</span>
                        </div>
                        {order.discount_total > 0 && (
                            <div className="flex justify-between">
                                <span>Giảm giá</span>
                                <span>-{formatPrice(order.discount_total).replace("đ", "")}</span>
                            </div>
                        )}
                        {order.tax > 0 && (
                            <div className="flex justify-between">
                                <span>Thuế VAT</span>
                                <span>{formatPrice(order.tax).replace("đ", "")}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-[14px] mt-2 border-t border-black border-dashed pt-2">
                            <span>TỔNG CỘNG</span>
                            <span>{formatPrice(order.total)}</span>
                        </div>
                    </div>

                    <div className="border-t border-black border-dashed mb-2" />

                    {/* Payments */}
                    {paymentAmount > 0 && (
                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between">
                                <span>Khách đưa ({order.payments?.[0]?.method.toUpperCase()})</span>
                                <span>{formatPrice(paymentAmount).replace("đ", "")}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Tiền thừa</span>
                                <span>{formatPrice(change).replace("đ", "")}</span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-6 text-[10px]">
                        <p className="font-bold mb-1 italic">Cảm ơn và hẹn gặp lại!</p>
                        <p>Pass WiFi: comtammatu</p>
                    </div>
                </div>
            </div>

            {/* Inject print-specific styles globally to hide UI when printing */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body > *:not(.print\\:block) {
            display: none !important;
          }
          @page {
            margin: 0;
            size: 80mm 297mm;
          }
        }
      `}} />
        </>
    );
}
