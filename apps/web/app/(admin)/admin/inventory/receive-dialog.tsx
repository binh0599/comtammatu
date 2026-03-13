"use client";

import { useState } from "react";
import type { PurchaseOrder, ReceivePoData } from "./po-types";
import {
  Badge,
  Button,
  DialogFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

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
  const [items, setItems] = useState<
    Record<
      number,
      {
        received_qty: string;
        reject_qty: string;
        reject_reason: string;
        quality_status: "accepted" | "partial" | "rejected";
        expiry_date: string;
      }
    >
  >(() => {
    const initial: Record<number, {
      received_qty: string;
      reject_qty: string;
      reject_reason: string;
      quality_status: "accepted" | "partial" | "rejected";
      expiry_date: string;
    }> = {};
    for (const item of po.purchase_order_items) {
      initial[item.id] = {
        received_qty: String(item.received_qty != null && item.received_qty > 0 ? item.received_qty : item.quantity),
        reject_qty: String(item.reject_qty ?? 0),
        reject_reason: item.reject_reason ?? "",
        quality_status: item.quality_status ?? "accepted",
        expiry_date: "",
      };
    }
    return initial;
  });

  type ItemData = {
    received_qty: string;
    reject_qty: string;
    reject_reason: string;
    quality_status: "accepted" | "partial" | "rejected";
    expiry_date: string;
  };

  const defaultItem: ItemData = {
    received_qty: "0",
    reject_qty: "0",
    reject_reason: "",
    quality_status: "accepted",
    expiry_date: "",
  };

  function getItem(prev: Record<number, ItemData>, id: number): ItemData {
    return prev[id] ?? defaultItem;
  }

  function updateItem(id: number, field: keyof ItemData, value: string) {
    setItems((prev) => {
      const current = getItem(prev, id);
      const updated: ItemData = { ...current, [field]: value };
      return { ...prev, [id]: updated };
    });
  }

  function handleQualityChange(id: number, status: string) {
    const ordered = po.purchase_order_items.find((i) => i.id === id)?.quantity ?? 0;
    setItems((prev) => {
      const current = getItem(prev, id);
      if (status === "rejected") {
        const updated: ItemData = {
          ...current,
          quality_status: "rejected",
          received_qty: "0",
          reject_qty: String(ordered),
        };
        return { ...prev, [id]: updated };
      }
      if (status === "accepted") {
        const updated: ItemData = {
          ...current,
          quality_status: "accepted",
          received_qty: String(ordered),
          reject_qty: "0",
          reject_reason: "",
        };
        return { ...prev, [id]: updated };
      }
      const updated: ItemData = { ...current, quality_status: status as "partial" };
      return { ...prev, [id]: updated };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onReceive({
      po_id: po.id,
      items: po.purchase_order_items.map((item) => {
        const data = items[item.id];
        return {
          po_item_id: item.id,
          ordered_qty: item.quantity,
          received_qty: parseFloat(data?.received_qty || "0") || 0,
          reject_qty: parseFloat(data?.reject_qty || "0") || 0,
          reject_reason: data?.reject_reason || undefined,
          quality_status: data?.quality_status ?? "accepted",
          expiry_date: data?.expiry_date || undefined,
        };
      }),
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
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nguyên liệu</TableHead>
                <TableHead scope="col" className="text-right">Đặt hàng</TableHead>
                <TableHead scope="col">Chất lượng</TableHead>
                <TableHead scope="col" className="w-[110px]">Thực nhận</TableHead>
                <TableHead scope="col" className="w-[110px]">Từ chối</TableHead>
                <TableHead scope="col">Lý do từ chối</TableHead>
                <TableHead scope="col" className="w-[130px]">Hạn sử dụng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.purchase_order_items.map((item) => {
                const data = items[item.id];
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.ingredients?.name ?? `#${item.ingredient_id}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.ingredients?.unit ?? ""}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={data?.quality_status ?? "accepted"}
                        onValueChange={(v) => handleQualityChange(item.id, v)}
                      >
                        <SelectTrigger className="h-8 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accepted">
                            <Badge variant="default" className="text-[10px]">Đạt</Badge>
                          </SelectItem>
                          <SelectItem value="partial">
                            <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">1 phần</Badge>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <Badge variant="destructive" className="text-[10px]">Không đạt</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-sm"
                        value={data?.received_qty ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, "received_qty", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-sm"
                        value={data?.reject_qty ?? ""}
                        disabled={data?.quality_status === "accepted"}
                        onChange={(e) =>
                          updateItem(item.id, "reject_qty", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        className="h-8 text-sm"
                        placeholder="Lý do..."
                        value={data?.reject_reason ?? ""}
                        disabled={data?.quality_status === "accepted"}
                        onChange={(e) =>
                          updateItem(item.id, "reject_reason", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={data?.expiry_date ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, "expiry_date", e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
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
