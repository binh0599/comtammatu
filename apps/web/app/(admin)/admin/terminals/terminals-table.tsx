"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Power, Plus, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTerminal,
  approveTerminal,
  toggleTerminal,
  deleteTerminal,
} from "./actions";

interface Terminal {
  id: number;
  branch_id: number;
  name: string;
  type: string;
  device_fingerprint: string;
  peripheral_config: unknown;
  is_active: boolean;
  last_seen_at: string | null;
  registered_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  branches: { tenant_id: number; name: string };
}

interface Branch {
  id: number;
  name: string;
}

function getTerminalTypeLabel(type: string) {
  switch (type) {
    case "mobile_order":
      return "Máy gọi món";
    case "cashier_station":
      return "Máy thu ngân";
    default:
      return type;
  }
}

export function TerminalsTable({
  terminals,
  branches,
}: {
  terminals: Terminal[];
  branches: Branch[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createTerminal(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
      }
    });
  }

  async function handleApprove(id: number) {
    startTransition(async () => {
      const result = await approveTerminal(id);
      if (result.error) setError(result.error);
    });
  }

  async function handleToggle(id: number) {
    startTransition(async () => {
      const result = await toggleTerminal(id);
      if (result.error) setError(result.error);
    });
  }

  async function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteTerminal(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Thiết bị POS</h2>
          <p className="text-muted-foreground">
            Quản lý thiết bị POS của nhà hàng
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm thiết bị
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm thiết bị POS</DialogTitle>
              <DialogDescription>
                Đăng ký thiết bị POS mới cho nhà hàng
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate}>
              <div className="grid gap-4 py-4">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên thiết bị</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="VD: POS Quầy 1"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Loại</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại thiết bị" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_order">
                        Máy gọi món
                      </SelectItem>
                      <SelectItem value="cashier_station">
                        Máy thu ngân
                      </SelectItem>
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
                <div className="grid gap-2">
                  <Label htmlFor="device_fingerprint">Mã thiết bị</Label>
                  <Input
                    id="device_fingerprint"
                    name="device_fingerprint"
                    placeholder="VD: POS-001"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang tạo..." : "Tạo thiết bị"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !open && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phê duyệt</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Chưa có thiết bị nào
                </TableCell>
              </TableRow>
            ) : (
              terminals.map((terminal) => (
                <TableRow key={terminal.id}>
                  <TableCell className="font-medium">
                    {terminal.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTerminalTypeLabel(terminal.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{terminal.branches.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={terminal.is_active ? "default" : "secondary"}
                    >
                      {terminal.is_active ? "Hoạt động" : "Tắt"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={terminal.approved_at ? "default" : "secondary"}
                    >
                      {terminal.approved_at ? "Đã duyệt" : "Chờ duyệt"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!terminal.approved_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(terminal.id)}
                          disabled={isPending}
                          title="Phê duyệt"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(terminal.id)}
                        disabled={isPending}
                        title={
                          terminal.is_active
                            ? "Tắt thiết bị"
                            : "Bật thiết bị"
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xóa thiết bị"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa thiết bị
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa thiết bị &quot;{terminal.name}
                              &quot;? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(terminal.id)}
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
