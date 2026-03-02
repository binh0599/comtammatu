"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { createShift, deleteShift } from "./actions";
import { formatTime } from "@comtammatu/shared";

interface Shift {
  id: number;
  name: string;
  branch_id: number;
  start_time: string;
  end_time: string;
  break_min: number | null;
  max_employees: number | null;
  created_at: string;
  branches: { name: string };
}

interface Branch {
  id: number;
  name: string;
}

export function ShiftsTab({
  shifts,
  branches,
}: {
  shifts: Shift[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createShift(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsCreateOpen(false);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteShift(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ca lam</h2>
          <p className="text-muted-foreground">
            Quan ly cac ca lam viec cua nha hang
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
              Them ca lam
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Them ca lam</DialogTitle>
                <DialogDescription>
                  Tao ca lam moi cho chi nhanh
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Ten ca</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="VD: Ca sang"
                    required
                  />
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
                    <Label htmlFor="start_time">Gio bat dau</Label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="time"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_time">Gio ket thuc</Label>
                    <Input
                      id="end_time"
                      name="end_time"
                      type="time"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="break_min">Nghi giua ca (phut)</Label>
                    <Input
                      id="break_min"
                      name="break_min"
                      type="number"
                      min={0}
                      placeholder="30"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max_employees">So NV toi da</Label>
                    <Input
                      id="max_employees"
                      name="max_employees"
                      type="number"
                      min={1}
                      placeholder="10"
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
                  {isPending ? "Dang tao..." : "Tao ca"}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ten ca</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Gio bat dau</TableHead>
              <TableHead>Gio ket thuc</TableHead>
              <TableHead>Nghi giua ca (phut)</TableHead>
              <TableHead>So NV toi da</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co ca lam nao
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.branches.name}</TableCell>
                  <TableCell>{formatTime(shift.start_time)}</TableCell>
                  <TableCell>{formatTime(shift.end_time)}</TableCell>
                  <TableCell>{shift.break_min ?? "-"}</TableCell>
                  <TableCell>{shift.max_employees ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Xoa ca">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xoa ca lam</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ban co chac muon xoa ca &quot;{shift.name}&quot;?
                            Hanh dong nay khong the hoan tac.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(shift.id)}
                          >
                            Xoa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
