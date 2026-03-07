"use client";

import { useState, useTransition } from "react";
import { CalendarIcon, TrendingUp, CreditCard, Receipt, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getReportData, type ReportSummary } from "./actions";

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Tien mat",
  qr: "QR / Chuyen khoan",
  momo: "Momo",
};

export function ReportsClient({
  initialData,
  initialStart,
  initialEnd,
}: {
  initialData: ReportSummary;
  initialStart: string;
  initialEnd: string;
}) {
  const [startDate, setStartDate] = useState<Date>(
    new Date(initialStart + "T00:00:00"),
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(initialEnd + "T00:00:00"),
  );
  const [data, setData] = useState<ReportSummary>(initialData);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const result = await getReportData(start, end);
      setData(result);
    });
  }

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(d) => d && setStartDate(d)}
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">den</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(d) => d && setEndDate(d)}
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        <Button onClick={handleRefresh} disabled={isPending}>
          {isPending ? "Dang tai..." : "Xem bao cao"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tong doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tong don hang</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gia tri TB/don</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.avgTicket)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tong tip</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.totalTips)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment methods */}
      {data.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Phuong thuc thanh toan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phuong thuc</TableHead>
                  <TableHead className="text-right">So luong</TableHead>
                  <TableHead className="text-right">Tong tien</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.paymentMethods.map((pm) => (
                  <TableRow key={pm.method}>
                    <TableCell>{METHOD_LABELS[pm.method] ?? pm.method}</TableCell>
                    <TableCell className="text-right">{pm.count}</TableCell>
                    <TableCell className="text-right">{formatVND(pm.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily breakdown */}
        {data.dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo ngay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngay</TableHead>
                      <TableHead className="text-right">Don</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">TB/don</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right">
                          {formatVND(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(row.avgTicket)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top items */}
        {data.topItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mon ban chay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mon</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        <TableCell className="text-right">
                          {formatVND(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
