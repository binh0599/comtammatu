"use client";

import {
  formatPrice,
  formatDateTime,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@comtammatu/shared/src/utils/format";
import type { Order } from "./orders-types";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  preparing: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  ready: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  served: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
};

const TYPE_BADGE: Record<string, string> = {
  dine_in: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  takeaway: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  delivery: "bg-teal-100 text-teal-800 hover:bg-teal-100",
};

export { STATUS_BADGE, TYPE_BADGE };

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Chi tiết đơn hàng {order?.order_number}
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết đơn hàng
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-6 py-4">
            {/* Order info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Chi nhánh:</span>{" "}
                <span className="font-medium">
                  {order.branches?.name ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Loại:</span>{" "}
                <Badge className={TYPE_BADGE[order.type] ?? ""}>
                  {getOrderTypeLabel(order.type)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>{" "}
                <Badge className={STATUS_BADGE[order.status] ?? ""}>
                  {getOrderStatusLabel(order.status)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Thời gian tạo:</span>{" "}
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              {order.table_id && (
                <div>
                  <span className="text-muted-foreground">Bàn:</span>{" "}
                  <span>#{order.table_id}</span>
                </div>
              )}
              {order.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Ghi chú:</span>{" "}
                  <span>{order.notes}</span>
                </div>
              )}
            </div>

            {/* Order items */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Danh sách món ({order.order_items.length})
              </h4>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Món</TableHead>
                      <TableHead className="text-center">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">
                        Thành tiền
                      </TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.menu_items?.name ?? `#${item.menu_item_id}`}
                          {item.notes && (
                            <span className="text-muted-foreground block text-xs">
                              {item.notes}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(Number(item.unit_price))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(Number(item.item_total))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_BADGE[item.status] ?? ""}
                          >
                            {getOrderStatusLabel(item.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thuế:</span>
                <span>{formatPrice(Number(order.tax))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí dịch vụ:</span>
                <span>
                  {formatPrice(Number(order.service_charge))}
                </span>
              </div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Giảm giá:</span>
                  <span>
                    -{formatPrice(Number(order.discount_total))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Tổng cộng:</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>

            {/* Payments */}
            {order.payments.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Thanh toán</h4>
                <div className="space-y-2 text-sm">
                  {order.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getPaymentMethodLabel(p.method)}</span>
                        <Badge
                          className={
                            p.status === "completed"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : p.status === "failed"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }
                        >
                          {getPaymentStatusLabel(p.status)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">
                          {formatPrice(Number(p.amount))}
                        </span>
                        {p.paid_at && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {formatDateTime(p.paid_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
