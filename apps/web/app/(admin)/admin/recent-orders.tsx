"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatPrice,
  formatDateTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import type { RecentOrder } from "./actions";

interface RecentOrdersProps {
  orders: RecentOrder[];
}

const orderTypeLabels: Record<string, string> = {
  dine_in: "Tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  cancelled: "secondary",
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
  completed: "default",
};

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Chưa có đơn hàng nào
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.order_number}
                    {order.tables && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (Bàn {order.tables.number})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {orderTypeLabels[order.type] ?? order.type}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariantMap[order.status] ?? "secondary"}
                    >
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(order.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(order.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
