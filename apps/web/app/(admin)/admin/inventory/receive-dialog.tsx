"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import type { PurchaseOrder, ReceivePoData } from "./po-types";

export function ReceiveDialog({
  po,
  onReceive,
  isPending,
  error,
}: {
  po: PurchaseOrder;
  onReceive: (data: ReceivePoData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>(
    () => {
      const initial: Record<number, string> = {};
      for (const item of po.purchase_order_items) {
        initial[item.id] = String(item.quantity);
      }
      return initial;
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onReceive({
      po_id: po.id,
      items: po.purchase_order_items.map((item) => ({
        po_item_id: item.id,
        received_qty: parseFloat(receivedQtys[item.id] ?? "0"),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="py-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nguyên liệu</TableHead>
                <TableHead scope="col" className="text-right">Đặt hàng</TableHead>
                <TableHead scope="col" className="w-[140px]">Thực nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.purchase_order_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.ingredients?.name ?? `#${item.ingredient_id}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.ingredients?.unit ?? ""}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedQtys[item.id] ?? ""}
                      onChange={(e) =>
                        setReceivedQtys({
                          ...receivedQtys,
                          [item.id]: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang xử lý..." : "Xác nhận nhận hàng"}
        </Button>
      </DialogFooter>
    </form>
  );
}
