"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { TABLE_STATUSES, getTableStatusLabel } from "@comtammatu/shared";
import { createTable, updateTable, deleteTable, updateTableStatus } from "./actions";
import { toast } from "sonner";

interface TableData {
  id: number;
  branch_id: number;
  number: number;
  capacity: number | null;
  status: string;
  zone_id: number;
  branches: { tenant_id: number; name: string };
  branch_zones: { name: string } | null;
}

interface Branch {
  id: number;
  name: string;
}

interface Zone {
  id: number;
  name: string;
  branch_id: number;
}

export function TableListTab({
  tables,
  branches,
  zones,
}: {
  tables: TableData[];
  branches: Branch[];
  zones: Zone[];
}) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = tables.filter((t) => {
    if (branchFilter !== "all" && t.branch_id !== Number(branchFilter)) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createTable(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Tạo bàn thành công");
        setCreateOpen(false);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    startTransition(async () => {
      const result = await updateTable(id, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cập nhật bàn thành công");
        setEditTable(null);
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Xác nhận xoá bàn này?")) return;
    startTransition(async () => {
      const result = await deleteTable(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Xoá bàn thành công");
      }
    });
  }

  function handleStatusChange(id: number, status: string) {
    startTransition(async () => {
      const result = await updateTableStatus(id, status);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả chi nhánh" />
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {TABLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getTableStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto gap-2">
              <Plus className="size-4" /> Thêm bàn
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm bàn mới</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-branch">Chi nhánh</Label>
                <select name="branch_id" id="create-branch" required className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-number">Số bàn</Label>
                <Input name="number" id="create-number" type="number" min={1} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-capacity">Sức chứa</Label>
                <Input name="capacity" id="create-capacity" type="number" min={1} defaultValue={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-zone">Khu vực</Label>
                <select name="zone_id" id="create-zone" className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">Chọn khu vực</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Đang tạo..." : "Tạo bàn"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Khu vực</TableHead>
                <TableHead className="w-[80px]">Sức chứa</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[100px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Không có bàn nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((table) => (
                  <TableRow key={table.id} className={isPending ? "opacity-60" : ""}>
                    <TableCell className="font-medium">Bàn {table.number}</TableCell>
                    <TableCell>{(table.branches as { name: string }).name}</TableCell>
                    <TableCell>{table.branch_zones?.name ?? "—"}</TableCell>
                    <TableCell>{table.capacity ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={table.status}
                        onValueChange={(val) => handleStatusChange(table.id, val)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {getTableStatusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setEditTable(table)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => handleDelete(table.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editTable} onOpenChange={(open) => !open && setEditTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bàn {editTable?.number}</DialogTitle>
          </DialogHeader>
          {editTable && (
            <form action={(fd) => handleUpdate(editTable.id, fd)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-number">Số bàn</Label>
                <Input name="number" id="edit-number" type="number" min={1} defaultValue={editTable.number} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Sức chứa</Label>
                <Input name="capacity" id="edit-capacity" type="number" min={1} defaultValue={editTable.capacity ?? 4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zone">Khu vực</Label>
                <select name="zone_id" id="edit-zone" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={editTable.zone_id}>
                  <option value="">Chọn khu vực</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Đang cập nhật..." : "Cập nhật"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
