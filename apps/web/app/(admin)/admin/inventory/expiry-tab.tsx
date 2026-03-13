"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { formatDate } from "@comtammatu/shared";
import { getExpiringBatches } from "./actions";
import {
  Badge,
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

interface ExpiringBatch {
  id: number;
  ingredient_id: number;
  quantity: number;
  expiry_date: string | null;
  po_id?: number | null;
  ingredients: { name: string; unit: string } | null;
}

export function ExpiryTab({
  initialData,
}: {
  initialData: ExpiringBatch[];
}) {
  const [batches, setBatches] = useState<ExpiringBatch[]>(initialData);
  const [daysAhead, setDaysAhead] = useState("7");
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const days = parseInt(daysAhead) || 7;
      const result = await getExpiringBatches(days);
      if (Array.isArray(result)) {
        setBatches(result);
      }
    });
  }

  function getDaysUntilExpiry(expiryDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    return diff;
  }

  function getExpiryBadge(expiryDate: string) {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) {
      return <Badge variant="destructive">Đã hết hạn</Badge>;
    }
    if (days === 0) {
      return <Badge variant="destructive">Hết hạn hôm nay</Badge>;
    }
    if (days <= 2) {
      return (
        <Badge className="bg-red-500 hover:bg-red-600">
          Còn {days} ngày
        </Badge>
      );
    }
    if (days <= 5) {
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700">
          Còn {days} ngày
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Còn {days} ngày
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hạn sử dụng</h2>
          <p className="text-muted-foreground">
            Theo dõi lô hàng sắp hết hạn sử dụng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="days-ahead" className="whitespace-nowrap text-sm">
              Xem trước (ngày)
            </Label>
            <Input
              id="days-ahead"
              type="number"
              min="1"
              max="90"
              className="w-20 h-9"
              value={daysAhead}
              onChange={(e) => setDaysAhead(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Đang tải..." : "Làm mới"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nguyên liệu</TableHead>
              <TableHead scope="col">Đơn vị</TableHead>
              <TableHead scope="col" className="text-right">Số lượng</TableHead>
              <TableHead scope="col">Hạn sử dụng</TableHead>
              <TableHead scope="col">Tình trạng</TableHead>
              <TableHead scope="col">Đơn mua hàng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Không có lô hàng nào sắp hết hạn
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    {batch.ingredients?.name ?? `#${batch.ingredient_id}`}
                  </TableCell>
                  <TableCell>
                    {batch.ingredients?.unit ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(batch.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>{batch.expiry_date ? formatDate(batch.expiry_date) : "-"}</TableCell>
                  <TableCell>{batch.expiry_date ? getExpiryBadge(batch.expiry_date) : "-"}</TableCell>
                  <TableCell>
                    {batch.po_id ? `PO #${batch.po_id}` : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
