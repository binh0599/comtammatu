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
import { createEmployee, updateEmployee } from "./actions";
import {
  getEmploymentTypeLabel,
  getEmployeeStatusLabel,
  formatPrice,
} from "@comtammatu/shared";

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

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Branch {
  id: number;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Chu so huu",
  manager: "Quan ly",
  cashier: "Thu ngan",
  chef: "Dau bep",
  waiter: "Phuc vu",
  inventory: "Kho",
  hr: "Nhan su",
  customer: "Khach hang",
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
  availableProfiles,
  branches,
}: {
  employees: Employee[];
  availableProfiles: Profile[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    const profileId = formData.get("profile_id") as string;
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
      const result = await createEmployee({
        profile_id: profileId,
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
          <h2 className="text-2xl font-bold tracking-tight">Nhan vien</h2>
          <p className="text-muted-foreground">
            Quan ly thong tin nhan vien cua nha hang
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
            <Button disabled={availableProfiles.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Them nhan vien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Them nhan vien</DialogTitle>
                <DialogDescription>
                  Tao ho so nhan vien tu tai khoan da co
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="profile_id">Tai khoan</Label>
                  <Select name="profile_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon tai khoan" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name} ({ROLE_LABELS[profile.role] ?? profile.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch_id">Chi nhanh</Label>
                  <Select name="branch_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon chi nhanh" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="position">Vi tri</Label>
                    <Input
                      id="position"
                      name="position"
                      placeholder="VD: Bep truong"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Bo phan</Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder="VD: Bep"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hire_date">Ngay vao lam</Label>
                    <Input id="hire_date" name="hire_date" type="date" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employment_type">Loai hop dong</Label>
                    <Select name="employment_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chon loai" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Toan thoi gian</SelectItem>
                        <SelectItem value="part">Ban thoi gian</SelectItem>
                        <SelectItem value="contract">Hop dong</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthly_salary">Luong thang (VND)</Label>
                    <Input
                      id="monthly_salary"
                      name="monthly_salary"
                      type="number"
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hourly_rate">Luong gio (VND)</Label>
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
                  Huy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Dang tao..." : "Tao nhan vien"}
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
              <TableHead>Ten</TableHead>
              <TableHead>Vai tro</TableHead>
              <TableHead>Vi tri</TableHead>
              <TableHead>Bo phan</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Loai HD</TableHead>
              <TableHead>Luong</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co nhan vien nao
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
                          title="Sua nhan vien"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <form
                          action={(formData) => handleUpdate(emp.id, formData)}
                        >
                          <DialogHeader>
                            <DialogTitle>Sua nhan vien</DialogTitle>
                            <DialogDescription>
                              Cap nhat thong tin cho &quot;{emp.profiles.full_name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                              {error}
                            </div>
                          )}
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-branch_id">Chi nhanh</Label>
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
                                <Label htmlFor="edit-position">Vi tri</Label>
                                <Input
                                  id="edit-position"
                                  name="position"
                                  defaultValue={emp.position}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-department">Bo phan</Label>
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
                                  Loai hop dong
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
                                      Toan thoi gian
                                    </SelectItem>
                                    <SelectItem value="part">
                                      Ban thoi gian
                                    </SelectItem>
                                    <SelectItem value="contract">
                                      Hop dong
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-status">Trang thai</Label>
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
                                      Dang lam
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                      Nghi
                                    </SelectItem>
                                    <SelectItem value="on_leave">
                                      Nghi phep
                                    </SelectItem>
                                    <SelectItem value="terminated">
                                      Da nghi
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-monthly_salary">
                                  Luong thang (VND)
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
                                  Luong gio (VND)
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
                              Huy
                            </Button>
                            <Button type="submit" disabled={isPending}>
                              {isPending ? "Dang luu..." : "Luu"}
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
