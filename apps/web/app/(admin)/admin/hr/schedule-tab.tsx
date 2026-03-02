"use client";

import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createShiftAssignment } from "./actions";
import {
  formatDate,
  formatTime,
  getShiftAssignmentStatusLabel,
} from "@comtammatu/shared";

interface ShiftAssignment {
  id: number;
  shift_id: number;
  employee_id: number;
  date: string;
  status: string;
  notes: string | null;
  employees: {
    id: number;
    profile_id: string;
    profiles: { full_name: string };
  };
  shifts: {
    name: string;
    start_time: string;
    end_time: string;
    branch_id: number;
    branches: { name: string };
  };
}

interface Employee {
  id: number;
  profile_id: string;
  profiles: { full_name: string; id: string; role: string };
}

interface Shift {
  id: number;
  name: string;
  branch_id: number;
  start_time: string;
  end_time: string;
  branches: { name: string };
}

function getAssignmentBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "scheduled":
      return "outline";
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "no_show":
      return "destructive";
    default:
      return "outline";
  }
}

export function ScheduleTab({
  assignments,
  employees,
  shifts,
}: {
  assignments: ShiftAssignment[];
  employees: Employee[];
  shifts: Shift[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    const shiftId = Number(formData.get("shift_id"));
    const employeeId = Number(formData.get("employee_id"));
    const date = formData.get("date") as string;
    const notes = (formData.get("notes") as string) || undefined;

    startTransition(async () => {
      const result = await createShiftAssignment({
        shift_id: shiftId,
        employee_id: employeeId,
        date,
        notes,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsCreateOpen(false);
      }
    });
  }

  // Group assignments by date
  const groupedByDate = assignments.reduce<
    Record<string, ShiftAssignment[]>
  >((acc, a) => {
    const existing = acc[a.date];
    if (!existing) {
      acc[a.date] = [a];
    } else {
      existing.push(a);
    }
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lich phan ca</h2>
          <p className="text-muted-foreground">
            Phan ca lam viec cho nhan vien (2 tuan gan nhat)
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) setError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={employees.length === 0 || shifts.length === 0}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Phan ca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Phan ca lam viec</DialogTitle>
                <DialogDescription>
                  Chon nhan vien, ca lam va ngay lam viec
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee_id">Nhan vien</Label>
                  <Select name="employee_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon nhan vien" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shift_id">Ca lam</Label>
                  <Select name="shift_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon ca lam" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={String(shift.id)}>
                          {shift.name} ({formatTime(shift.start_time)} -{" "}
                          {formatTime(shift.end_time)}) - {shift.branches.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Ngay</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chu</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Ghi chu them (khong bat buoc)"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Huy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Dang luu..." : "Phan ca"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {sortedDates.length === 0 ? (
        <div className="text-muted-foreground flex h-24 items-center justify-center rounded-md border">
          Chua co lich phan ca trong khoang thoi gian nay
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h3 className="text-lg font-semibold">{formatDate(date)}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ca lam</TableHead>
                      <TableHead>Gio</TableHead>
                      <TableHead>Chi nhanh</TableHead>
                      <TableHead>Nhan vien</TableHead>
                      <TableHead>Trang thai</TableHead>
                      <TableHead>Ghi chu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupedByDate[date] ?? []).map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.shifts.name}
                        </TableCell>
                        <TableCell>
                          {formatTime(assignment.shifts.start_time)} -{" "}
                          {formatTime(assignment.shifts.end_time)}
                        </TableCell>
                        <TableCell>
                          {assignment.shifts.branches.name}
                        </TableCell>
                        <TableCell>
                          {assignment.employees.profiles.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getAssignmentBadgeVariant(
                              assignment.status
                            )}
                          >
                            {getShiftAssignmentStatusLabel(assignment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
