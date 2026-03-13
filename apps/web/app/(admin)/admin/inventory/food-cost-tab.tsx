"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { formatPrice } from "@comtammatu/shared";
import { getFoodCostReport } from "./actions";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

interface FoodCostData {
  total_revenue: number;
  total_ingredient_cost: number;
  food_cost_pct: number;
  item_count: number;
  top_cost_items: { ingredient_name: string; total_qty: number; total_cost: number }[];
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function FoodCostTab() {
  const today = formatLocalDate(new Date());
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgo = formatLocalDate(weekAgoDate);

  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<FoodCostData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSearch() {
    setError(null);

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      setError("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }

    startTransition(async () => {
      const result = await getFoodCostReport({
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
        setData(null);
      } else if (result && "data" in result) {
        setData(result.data as FoodCostData);
      }
    });
  }

  function getCostColor(pct: number) {
    if (pct <= 30) return "text-green-600";
    if (pct <= 35) return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chi phí nguyên liệu</h2>
          <p className="text-muted-foreground">
            Báo cáo food cost theo khoảng thời gian
          </p>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="grid gap-2">
          <Label htmlFor="date-from">Từ ngày</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date-to">Đến ngày</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending}>
          <Search className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Đang tính..." : "Xem báo cáo"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Doanh thu</CardDescription>
                <CardTitle className="text-2xl">
                  {formatPrice(data.total_revenue)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Chi phí nguyên liệu</CardDescription>
                <CardTitle className="text-2xl">
                  {formatPrice(data.total_ingredient_cost)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Food Cost %</CardDescription>
                <CardTitle className={`text-2xl ${getCostColor(data.food_cost_pct)}`}>
                  {Number(data.food_cost_pct).toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Số món bán</CardDescription>
                <CardTitle className="text-2xl">
                  {data.item_count}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {data.top_cost_items && data.top_cost_items.length > 0 && (
            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Nguyên liệu tốn nhiều chi phí nhất
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Nguyên liệu</TableHead>
                      <TableHead scope="col" className="text-right">
                        Tổng số lượng
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        Tổng chi phí
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_cost_items.map((item) => (
                      <TableRow key={item.ingredient_name}>
                        <TableCell className="font-medium">
                          {item.ingredient_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.total_qty).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
