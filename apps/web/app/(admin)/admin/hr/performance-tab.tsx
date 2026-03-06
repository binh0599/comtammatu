"use client";

import { useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";
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
  getStaffPerformance,
  type StaffPerformanceRow,
} from "./performance-actions";

const ROLE_LABELS: Record<string, string> = {
  waiter: "Phuc vu",
  cashier: "Thu ngan",
  chef: "Bep",
};

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

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Vai tro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca</SelectItem>
            <SelectItem value="waiter">Phuc vu</SelectItem>
            <SelectItem value="cashier">Thu ngan</SelectItem>
            <SelectItem value="chef">Bep</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? "Dang tai..." : "Xem hieu suat"}
        </Button>
      </div>

      {!loaded && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chon tham so va nhan &quot;Xem hieu suat&quot;
          </p>
        </div>
      )}

      {loaded && (
        <>
          {/* Waiters */}
          {showWaiters && waiters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Phuc vu ({waiters.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ten</TableHead>
                      <TableHead>Chi nhanh</TableHead>
                      <TableHead className="text-right">Don tao</TableHead>
                      <TableHead className="text-right">TB mon/don</TableHead>
                      <TableHead className="text-right">Chuyen can</TableHead>
                      <TableHead className="text-center">Diem</TableHead>
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
                <CardTitle>Thu ngan ({cashiers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ten</TableHead>
                      <TableHead>Chi nhanh</TableHead>
                      <TableHead className="text-right">
                        Thanh toan xu ly
                      </TableHead>
                      <TableHead className="text-right">Chuyen can</TableHead>
                      <TableHead className="text-center">Diem</TableHead>
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
                <CardTitle>Bep ({chefs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ten</TableHead>
                      <TableHead>Chi nhanh</TableHead>
                      <TableHead className="text-right">
                        Ticket xu ly
                      </TableHead>
                      <TableHead className="text-right">
                        TB thoi gian (phut)
                      </TableHead>
                      <TableHead className="text-right">Chuyen can</TableHead>
                      <TableHead className="text-center">Diem</TableHead>
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
                Khong co du lieu nhan vien cho khoang thoi gian nay
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
