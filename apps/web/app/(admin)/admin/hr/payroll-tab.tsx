"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calculator, Eye, CheckCircle, Wallet, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  formatDate,
  formatPrice,
  getPayrollStatusLabel,
} from "@comtammatu/shared";
import {
  createPayrollPeriod,
  calculatePayroll,
  approvePayroll,
  markPayrollPaid,
  deletePayrollPeriod,
  getPayrollEntries,
  updatePayrollEntry,
} from "./actions";

interface PayrollPeriod {
  id: number;
  tenant_id: number;
  branch_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  branches: { name: string };
}

interface PayrollEntry {
  id: number;
  period_id: number;
  employee_id: number;
  total_hours: number;
  hourly_rate: number | null;
  monthly_salary: number | null;
  base_pay: number;
  overtime_hours: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  net_pay: number;
  notes: string | null;
  employees: {
    profiles: { full_name: string };
  };
}

interface PayrollTabProps {
  periods: PayrollPeriod[];
  branches: Array<{ id: number; name: string }>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">{getPayrollStatusLabel(status)}</Badge>;
    case "calculated":
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          {getPayrollStatusLabel(status)}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          {getPayrollStatusLabel(status)}
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="default" className="bg-purple-100 text-purple-800">
          {getPayrollStatusLabel(status)}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{getPayrollStatusLabel(status)}</Badge>;
  }
}

export function PayrollTab({ periods, branches }: PayrollTabProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Detail dialog state
  const [detailPeriod, setDetailPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  // Edit entry state
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    const branchId = Number(formData.get("branch_id"));
    const name = formData.get("name") as string;
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;
    const notes = (formData.get("notes") as string) || undefined;

    startTransition(async () => {
      const result = await createPayrollPeriod({
        branch_id: branchId,
        name,
        start_date: startDate,
        end_date: endDate,
        notes,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsCreateOpen(false);
        toast.success("Kỳ lương đã được tạo");
        router.refresh();
      }
    });
  }

  function handleCalculate(periodId: number) {
    startTransition(async () => {
      const result = await calculatePayroll(periodId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã tính lương thành công");
        router.refresh();
      }
    });
  }

  function handleApprove(periodId: number) {
    startTransition(async () => {
      const result = await approvePayroll(periodId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã duyệt bảng lương");
        router.refresh();
      }
    });
  }

  function handleMarkPaid(periodId: number) {
    startTransition(async () => {
      const result = await markPayrollPaid(periodId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã đánh dấu đã trả lương");
        router.refresh();
      }
    });
  }

  function handleDelete(periodId: number) {
    startTransition(async () => {
      const result = await deletePayrollPeriod(periodId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã xóa kỳ lương");
        router.refresh();
      }
    });
  }

  function handleViewDetail(period: PayrollPeriod) {
    setDetailPeriod(period);
    setIsLoadingEntries(true);
    setEditingEntry(null);
    startTransition(async () => {
      const result = await getPayrollEntries(period.id);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        setIsLoadingEntries(false);
      } else {
        setEntries(result as unknown as PayrollEntry[]);
        setIsLoadingEntries(false);
      }
    });
  }

  function handleUpdateEntry(formData: FormData) {
    if (!editingEntry) return;
    setError(null);

    const overtimeHours = Number(formData.get("overtime_hours")) || 0;
    const overtimePay = Number(formData.get("overtime_pay")) || 0;
    const deductions = Number(formData.get("deductions")) || 0;
    const bonuses = Number(formData.get("bonuses")) || 0;
    const notes = (formData.get("notes") as string) || undefined;

    startTransition(async () => {
      const result = await updatePayrollEntry({
        id: editingEntry.id,
        overtime_hours: overtimeHours,
        overtime_pay: overtimePay,
        deductions,
        bonuses,
        notes,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditingEntry(null);
        toast.success("Đã cập nhật bản ghi lương");
        // Refresh entries
        if (detailPeriod) {
          const refreshed = await getPayrollEntries(detailPeriod.id);
          if (!("error" in refreshed)) {
            setEntries(refreshed as unknown as PayrollEntry[]);
          }
        }
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bảng lương</h2>
          <p className="text-muted-foreground">
            Quản lý kỳ lương và bảng lương nhân viên
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
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tạo kỳ lương
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tạo kỳ lương mới</DialogTitle>
                <DialogDescription>
                  Tạo kỳ lương cho chi nhánh
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="branch_id">Chi nhánh</Label>
                  <Select name="branch_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên kỳ lương</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="VD: Lương tháng 3/2026"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Ngày bắt đầu</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_date">Ngày kết thúc</Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Ghi chú (tùy chọn)"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang tạo..." : "Tạo kỳ lương"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Periods table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên</TableHead>
              <TableHead scope="col">Chi nhánh</TableHead>
              <TableHead scope="col">Kỳ lương</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có kỳ lương nào
                </TableCell>
              </TableRow>
            ) : (
              periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>{period.branches.name}</TableCell>
                  <TableCell>
                    {formatDate(period.start_date)} &mdash;{" "}
                    {formatDate(period.end_date)}
                  </TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {period.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCalculate(period.id)}
                          disabled={isPending}
                          title="Tính lương"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetail(period)}
                        disabled={isPending}
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {period.status === "calculated" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(period.id)}
                          disabled={isPending}
                          title="Duyệt"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {period.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkPaid(period.id)}
                          disabled={isPending}
                          title="Đã trả"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                      )}
                      {period.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(period.id)}
                          disabled={isPending}
                          title="Xóa"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={detailPeriod !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPeriod(null);
            setEntries([]);
            setEditingEntry(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết: {detailPeriod?.name}
            </DialogTitle>
            <DialogDescription>
              {detailPeriod
                ? `${detailPeriod.branches.name} | ${formatDate(detailPeriod.start_date)} — ${formatDate(detailPeriod.end_date)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                Chưa có dữ liệu lương. Hãy tính lương trước.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nhân viên</TableHead>
                    <TableHead scope="col" className="text-right">Tổng giờ</TableHead>
                    <TableHead scope="col" className="text-right">Lương giờ</TableHead>
                    <TableHead scope="col" className="text-right">Lương tháng</TableHead>
                    <TableHead scope="col" className="text-right">Lương cơ bản</TableHead>
                    <TableHead scope="col" className="text-right">Tăng ca</TableHead>
                    <TableHead scope="col" className="text-right">Thưởng</TableHead>
                    <TableHead scope="col" className="text-right">Khấu trừ</TableHead>
                    <TableHead scope="col" className="text-right">Thực nhận</TableHead>
                    {detailPeriod?.status === "calculated" && (
                      <TableHead scope="col" className="text-right">Thao tác</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.employees.profiles.full_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.total_hours}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.hourly_rate != null
                          ? formatPrice(entry.hourly_rate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.monthly_salary != null
                          ? formatPrice(entry.monthly_salary)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(entry.base_pay)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(entry.overtime_pay)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(entry.bonuses)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(entry.deductions)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(entry.net_pay)}
                      </TableCell>
                      {detailPeriod?.status === "calculated" && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingEntry(entry);
                              setError(null);
                            }}
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntry(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {editingEntry && (
            <form action={handleUpdateEntry}>
              <DialogHeader>
                <DialogTitle>Chỉnh sửa bản ghi lương</DialogTitle>
                <DialogDescription>
                  {editingEntry.employees.profiles.full_name}
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-overtime_hours">Giờ tăng ca</Label>
                    <Input
                      id="edit-overtime_hours"
                      name="overtime_hours"
                      type="number"
                      min={0}
                      step="0.5"
                      defaultValue={editingEntry.overtime_hours}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-overtime_pay">Tiền tăng ca (VND)</Label>
                    <Input
                      id="edit-overtime_pay"
                      name="overtime_pay"
                      type="number"
                      min={0}
                      defaultValue={editingEntry.overtime_pay}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-bonuses">Thưởng (VND)</Label>
                    <Input
                      id="edit-bonuses"
                      name="bonuses"
                      type="number"
                      min={0}
                      defaultValue={editingEntry.bonuses}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-deductions">Khấu trừ (VND)</Label>
                    <Input
                      id="edit-deductions"
                      name="deductions"
                      type="number"
                      min={0}
                      defaultValue={editingEntry.deductions}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Ghi chú</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingEntry.notes ?? ""}
                    rows={3}
                    placeholder="Ghi chú (tùy chọn)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingEntry(null);
                    setError(null);
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
