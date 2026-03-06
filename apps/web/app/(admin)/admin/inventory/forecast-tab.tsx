"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDemandForecast,
  type ForecastRow,
} from "./forecast-actions";

interface ForecastTabProps {
  branches: { id: number; name: string }[];
}

function getUrgencyBadge(days: number | null) {
  if (days === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Khong su dung
      </Badge>
    );
  }
  if (days < 3) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {days} ngay
      </Badge>
    );
  }
  if (days < 7) {
    return (
      <Badge className="gap-1 bg-yellow-500 text-white hover:bg-yellow-600">
        <Clock className="h-3 w-3" />
        {days} ngay
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700">
      <CheckCircle className="h-3 w-3" />
      {days} ngay
    </Badge>
  );
}

export function ForecastTab({ branches }: ForecastTabProps) {
  const [daysAhead, setDaysAhead] = useState("7");
  const [branchId, setBranchId] = useState("all");
  const [data, setData] = useState<ForecastRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  function handleLoad() {
    startTransition(async () => {
      const result = await getDemandForecast(
        Number(daysAhead),
        branchId === "all" ? undefined : Number(branchId),
      );
      setData(result);
      setLoaded(true);
    });
  }

  const urgentCount = data.filter(
    (r) => r.days_until_stockout !== null && r.days_until_stockout < 3,
  ).length;
  const warningCount = data.filter(
    (r) =>
      r.days_until_stockout !== null &&
      r.days_until_stockout >= 3 &&
      r.days_until_stockout < 7,
  ).length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={daysAhead} onValueChange={setDaysAhead}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="So ngay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngay</SelectItem>
            <SelectItem value="14">14 ngay</SelectItem>
            <SelectItem value="30">30 ngay</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Chi nhanh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca chi nhanh</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? "Dang tai..." : "Du bao"}
        </Button>
      </div>

      {!loaded && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chon tham so va nhan &quot;Du bao&quot; de xem ket qua
          </p>
        </div>
      )}

      {loaded && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Can dat hang gap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {urgentCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Het trong vong 3 ngay
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Can theo doi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {warningCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Het trong 3-7 ngay
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Tong nguyen lieu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.length}</div>
                <p className="text-xs text-muted-foreground">
                  Du bao {daysAhead} ngay toi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Forecast table */}
          <Card>
            <CardHeader>
              <CardTitle>Du bao nhu cau nguyen lieu</CardTitle>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Khong co du lieu nguyen lieu
                </p>
              ) : (
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nguyen lieu</TableHead>
                        <TableHead>Don vi</TableHead>
                        <TableHead className="text-right">Ton kho</TableHead>
                        <TableHead className="text-right">
                          TB/ngay
                        </TableHead>
                        <TableHead className="text-right">
                          Can ({daysAhead} ngay)
                        </TableHead>
                        <TableHead className="text-center">
                          Con lai
                        </TableHead>
                        <TableHead className="text-center">
                          Dat hang
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => (
                        <TableRow
                          key={row.ingredient_id}
                          className={cn(
                            row.days_until_stockout !== null &&
                              row.days_until_stockout < 3 &&
                              "bg-red-50 dark:bg-red-950/20",
                            row.days_until_stockout !== null &&
                              row.days_until_stockout >= 3 &&
                              row.days_until_stockout < 7 &&
                              "bg-yellow-50 dark:bg-yellow-950/20",
                          )}
                        >
                          <TableCell className="font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell>{row.unit}</TableCell>
                          <TableCell className="text-right">
                            {row.current_stock.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.daily_avg_usage.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.projected_need.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-center">
                            {getUrgencyBadge(row.days_until_stockout)}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.reorder_suggested ? (
                              <Badge variant="destructive">Can dat</Badge>
                            ) : (
                              <Badge variant="outline">Du</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
