"use client";

import { formatPrice } from "@comtammatu/shared";
import type { TopSellingItem } from "./actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

interface TopItemsProps {
  items: TopSellingItem[];
}

export function TopItems({ items }: TopItemsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Món bán chạy (30 ngày)</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Chưa có dữ liệu bán hàng</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-10">
                    #
                  </TableHead>
                  <TableHead scope="col">Tên món</TableHead>
                  <TableHead scope="col" className="text-right">
                    Số lượng
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Doanh thu
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.name}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.total_qty}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.total_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
