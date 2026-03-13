"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { getPrepList } from "./actions";
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

interface PrepItem {
  ingredient_name: string;
  unit: string;
  current_stock: number;
  needed_qty: number;
  prep_qty: number;
}

function mapPrepData(raw: unknown[]): PrepItem[] {
  return (raw as Record<string, unknown>[]).map((r) => ({
    ingredient_name: String(r.ingredient_name ?? ""),
    unit: String(r.unit ?? ""),
    current_stock: Number(r.current_stock ?? 0),
    needed_qty: Number(r.total_needed ?? r.needed_qty ?? 0),
    prep_qty: Number(r.to_prep ?? r.prep_qty ?? 0),
  }));
}

export function PrepListTab({
  initialData,
}: {
  initialData: PrepItem[];
}) {
  const [items, setItems] = useState<PrepItem[]>(initialData);
  const [portions, setPortions] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const target = portions ? Number(portions) : undefined;
      const data = await getPrepList(target);
      if (Array.isArray(data)) {
        setItems(mapPrepData(data));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh sách chuẩn bị</h2>
          <p className="text-muted-foreground">
            Nguyên liệu cần chuẩn bị cho ca làm việc
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="target-portions" className="whitespace-nowrap text-sm">
              Mục tiêu (phần)
            </Label>
            <Input
              id="target-portions"
              type="number"
              min="0"
              className="w-24 h-9"
              placeholder="Tự động"
              value={portions}
              onChange={(e) => setPortions(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Đang tải..." : "Tính lại"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nguyên liệu</TableHead>
              <TableHead scope="col">Đơn vị</TableHead>
              <TableHead scope="col" className="text-right">Tồn kho</TableHead>
              <TableHead scope="col" className="text-right">Cần dùng</TableHead>
              <TableHead scope="col" className="text-right">Cần chuẩn bị</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Không có nguyên liệu cần chuẩn bị
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.ingredient_name}>
                  <TableCell className="font-medium">
                    {item.ingredient_name}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">
                    {Number(item.current_stock).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.needed_qty).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(item.prep_qty).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {item.prep_qty > 0 ? (
                      <Badge variant="destructive">Thiếu</Badge>
                    ) : (
                      <Badge
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Đủ
                      </Badge>
                    )}
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
