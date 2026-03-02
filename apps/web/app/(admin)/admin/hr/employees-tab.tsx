"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffAccount, updateEmployee } from "./actions";
import {
  getEmploymentTypeLabel,
  getEmployeeStatusLabel,
  formatPrice,
} from "@comtammatu/shared";
import { toast } from "sonner";

interface Employee {
  id: number;
  profile_id: string;
  branch_id: number;
  position: string;
  department: string | null;
  hire_date: string;
  employment_type: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  status: string;
  created_at: string;
  profiles: { full_name: string; id: string; role: string };
  branches: { name: string };
}

interface Branch {
  id: number;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Chủ sở hữu",
  manager: "Quản lý chi nhánh",
  cashier: "Thu ngân",
  chef: "Đầu bếp",
  waiter: "Phục vụ",
  inventory: "Kho",
  hr: "Nhân sự / Kế toán",
  customer: "Khách hàng",
};

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "inactive":
      return "secondary";
    case "on_leave":
      return "outline";
    case "terminated":
      return "destructive";
    default:
      return "default";
  }
}

export function EmployeesTab({
  employees,
  creatableRoles,
  branches,
}: {
  employees: Employee[];
  creatableRoles: string[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);

    const email = formData.get("email") as string;
    const fullName = formData.get("full_name") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const branchId = Number(formData.get("branch_id"));
    const position = formData.get("position") as string;
    const department = (formData.get("department") as string) || undefined;
    const hireDate = formData.get("hire_date") as string;
    const employmentType = formData.get("employment_type") as string;
    const monthlySalary = formData.get("monthly_salary")
      ? Number(formData.get("monthly_salary"))
      : undefined;
    const hourlyRate = formData.get("hourly_rate")
      ? Number(formData.get("hourly_rate"))
      : undefined;

    startTransition(async () => {
      const result = await createStaffAccount({
        email,
        full_name: fullName,
        password,
        role: role as "manager" | "hr" | "cashier" | "waiter" | "chef",
        branch_id: branchId,
        position,
        department,
        hire_date: hireDate,
        employment_type: employmentType as "full" | "part" | "contract",
        monthly_salary: monthlySalary,
        hourly_rate: hourlyRate,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsCreateOpen(false);
        toast.success("Tài khoản đã tạo — thông báo mật khẩu cho nhân viên");
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    setError(null);
    const position = formData.get("position") as string;
    const department = (formData.get("department") as string) || undefined;
    const branchId = Number(formData.get("branch_id"));
    const employmentType = formData.get("employment_type") as string;
    const status = formData.get("status") as string;
    const monthlySalary = formData.get("monthly_salary")
      ? Number(formData.get("monthly_salary"))
      : undefined;
    const hourlyRate = formData.get("hourly_rate")
      ? Number(formData.get("hourly_rate"))
      : undefined;

    startTransition(async () => {
      const result = await updateEmployee(id, {
        position,
        department,
        branch_id: branchId,
        employment_type: employmentType as "full" | "part" | "contract",
        status: status as "active" | "inactive" | "on_leave" | "terminated",
        monthly_salary: monthlySalary,
        hourly_rate: hourlyRate,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditingEmployee(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhân viên</h2>
          <p className="text-muted-foreground">
            Quản lý thông tin nhân viên của nhà hàng
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
            <Button disabled={creatableRoles.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm nhân viên
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Thêm nhân viên mới</DialogTitle>
                <DialogDescription>
                  Tạo tài khoản đăng nhập và hồ sơ nhân viên
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                {/* Account info */}
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Họ và tên</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="VD: Nguyễn Văn A"
                    required
                    minLength={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email đăng nhập</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nhanvien@email.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    minLength={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        {creatableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r] ?? r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                {/* Employment info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="position">Vị trí</Label>
                    <Input
                      id="position"
                      name="position"
                      placeholder="VD: Bếp trưởng"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Bộ phận</Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder="VD: Bếp"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hire_date">Ngày vào làm</Label>
                    <Input
                      id="hire_date"
                      name="hire_date"
                      type="date"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employment_type">Loại hợp đồng</Label>
                    <Select name="employment_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Toàn thời gian</SelectItem>
                        <SelectItem value="part">Bán thời gian</SelectItem>
                        <SelectItem value="contract">Hợp đồng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthly_salary">Lương tháng (VND)</Label>
                    <Input
                      id="monthly_salary"
                      name="monthly_salary"
                      type="number"
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hourly_rate">Lương giờ (VND)</Label>
                    <Input
                      id="hourly_rate"
                      name="hourly_rate"
                      type="number"
                      min={0}
                      placeholder="0"
                    />
                  </div>
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
                  {isPending ? "Đang tạo..." : "Tạo tài khoản"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && !editingEmployee && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Loại HĐ</TableHead>
              <TableHead>Lương</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có nhân viên nào
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    {emp.profiles.full_name}
                  </TableCell>
                  <TableCell>
                    {ROLE_LABELS[emp.profiles.role] ?? emp.profiles.role}
                  </TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>{emp.department ?? "-"}</TableCell>
                  <TableCell>{emp.branches.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getEmploymentTypeLabel(emp.employment_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {emp.monthly_salary
                      ? formatPrice(emp.monthly_salary) + "/th"
                      : emp.hourly_rate
                        ? formatPrice(emp.hourly_rate) + "/h"
                        : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(emp.status)}>
                      {getEmployeeStatusLabel(emp.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      open={editingEmployee?.id === emp.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingEmployee(null);
                          setError(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setError(null);
                            setEditingEmployee(emp);
                          }}
                          title="Sửa nhân viên"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <form
                          action={(formData) => handleUpdate(emp.id, formData)}
                        >
                          <DialogHeader>
                            <DialogTitle>Sửa nhân viên</DialogTitle>
                            <DialogDescription>
                              Cập nhật thông tin cho &quot;{emp.profiles.full_name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                              {error}
                            </div>
                          )}
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-branch_id">Chi nhánh</Label>
                              <Select
                                name="branch_id"
                                defaultValue={String(emp.branch_id)}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {branches.map((branch) => (
                                    <SelectItem
                                      key={branch.id}
                                      value={String(branch.id)}
                                    >
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-position">Vị trí</Label>
                                <Input
                                  id="edit-position"
                                  name="position"
                                  defaultValue={emp.position}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-department">Bộ phận</Label>
                                <Input
                                  id="edit-department"
                                  name="department"
                                  defaultValue={emp.department ?? ""}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-employment_type">
                                  Loại hợp đồng
                                </Label>
                                <Select
                                  name="employment_type"
                                  defaultValue={emp.employment_type}
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">
                                      Toàn thời gian
                                    </SelectItem>
                                    <SelectItem value="part">
                                      Bán thời gian
                                    </SelectItem>
                                    <SelectItem value="contract">
                                      Hợp đồng
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-status">Trạng thái</Label>
                                <Select
                                  name="status"
                                  defaultValue={emp.status}
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">
                                      Đang làm
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                      Nghỉ
                                    </SelectItem>
                                    <SelectItem value="on_leave">
                                      Nghỉ phép
                                    </SelectItem>
                                    <SelectItem value="terminated">
                                      Đã nghỉ
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-monthly_salary">
                                  Lương tháng (VND)
                                </Label>
                                <Input
                                  id="edit-monthly_salary"
                                  name="monthly_salary"
                                  type="number"
                                  min={0}
                                  defaultValue={emp.monthly_salary ?? ""}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-hourly_rate">
                                  Lương giờ (VND)
                                </Label>
                                <Input
                                  id="edit-hourly_rate"
                                  name="hourly_rate"
                                  type="number"
                                  min={0}
                                  defaultValue={emp.hourly_rate ?? ""}
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingEmployee(null);
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
                      </DialogContent>
                    </Dialog>
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
