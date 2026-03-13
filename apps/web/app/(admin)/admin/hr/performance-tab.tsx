"use client";

import { useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  getStaffPerformance,
  type StaffPerformanceRow,
} from "./performance-actions";
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
  cn,
} from "@comtammatu/ui";

function getScoreBadge(score: number) {
  if (score >= 80) {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-700">
        {score}
      </Badge>
    );
  }
  if (score >= 60) {
    return (
      <Badge className="bg-blue-500 text-white hover:bg-blue-600">
        {score}
      </Badge>
    );
  }
  if (score >= 40) {
    return (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
        {score}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">{score}</Badge>
  );
}

interface PerformanceTabProps {
  branches: { id: number; name: string }[];
}

export function PerformanceTab({ branches }: PerformanceTabProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [startDate, setStartDate] = useState<Date>(monthStart);
  const [endDate, setEndDate] = useState<Date>(now);
  const [branchId, setBranchId] = useState("all");
  const [role, setRole] = useState("all");
  const [data, setData] = useState<StaffPerformanceRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  function handleLoad() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const result = await getStaffPerformance(
        start,
        end,
        branchId === "all" ? undefined : Number(branchId),
        role === "all" ? undefined : role,
      );
      setData(result);
      setLoaded(true);
    });
  }

  // Group by role for role-specific columns
  const waiters = data.filter((r) => r.role === "waiter");
  const cashiers = data.filter((r) => r.role === "cashier");
  const chefs = data.filter((r) => r.role === "chef");

  const showWaiters = role === "all" || role === "waiter";
  const showCashiers = role === "all" || role === "cashier";
  const showChefs = role === "all" || role === "chef";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[200px] justify-start text-left font-normal",
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

        <span className="text-muted-foreground">đến</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[200px] justify-start text-left font-normal",
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

        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Chi nhánh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chi nhánh</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="waiter">Phục vụ</SelectItem>
            <SelectItem value="cashier">Thu ngân</SelectItem>
            <SelectItem value="chef">Bếp</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? "Đang tải..." : "Xem hiệu suất"}
        </Button>
      </div>

      {!loaded && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chọn tham số và nhấn &quot;Xem hiệu suất&quot;
          </p>
        </div>
      )}

      {loaded && (
        <>
          {/* Waiters */}
          {showWaiters && waiters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Phục vụ ({waiters.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead className="text-right">Đơn tạo</TableHead>
                      <TableHead className="text-right">TB món/đơn</TableHead>
                      <TableHead className="text-right">Chuyên cần</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waiters.map((w) => (
                      <TableRow key={w.employee_id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>{w.branch_name}</TableCell>
                        <TableCell className="text-right">
                          {w.metrics.orders_created ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.metrics.avg_items_per_order ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.metrics.attendance_rate !== undefined
                            ? `${w.metrics.attendance_rate}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getScoreBadge(w.score)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Cashiers */}
          {showCashiers && cashiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Thu ngân ({cashiers.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead className="text-right">
                        Thanh toán xử lý
                      </TableHead>
                      <TableHead className="text-right">Chuyên cần</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashiers.map((c) => (
                      <TableRow key={c.employee_id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.branch_name}</TableCell>
                        <TableCell className="text-right">
                          {c.metrics.payments_processed ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.metrics.attendance_rate !== undefined
                            ? `${c.metrics.attendance_rate}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getScoreBadge(c.score)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Chefs */}
          {showChefs && chefs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bếp ({chefs.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead className="text-right">
                        Ticket xử lý
                      </TableHead>
                      <TableHead className="text-right">
                        TB thời gian (phút)
                      </TableHead>
                      <TableHead className="text-right">Chuyên cần</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chefs.map((ch) => (
                      <TableRow key={ch.employee_id}>
                        <TableCell className="font-medium">
                          {ch.name}
                        </TableCell>
                        <TableCell>{ch.branch_name}</TableCell>
                        <TableCell className="text-right">
                          {ch.metrics.tickets_bumped ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {ch.metrics.avg_prep_time_min !== undefined
                            ? ch.metrics.avg_prep_time_min
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {ch.metrics.attendance_rate !== undefined
                            ? `${ch.metrics.attendance_rate}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getScoreBadge(ch.score)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.length === 0 && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Không có dữ liệu nhân viên cho khoảng thời gian này
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
