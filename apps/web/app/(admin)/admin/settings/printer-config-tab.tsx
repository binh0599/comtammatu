"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import {
  getPrinterTypeLabel,
  getPrinterTestStatusLabel,
  getPrinterAssignedTypeLabel,
} from "@comtammatu/shared";
import {
  createPrinterConfig,
  deletePrinterConfig,
  updatePrinterConfig,
} from "./printer-actions";

type PrinterType = "browser" | "thermal_usb" | "thermal_network";

interface PrinterConfigRow {
  id: number;
  name: string;
  type: string;
  connection_config: Record<string, unknown>;
  paper_width_mm: number;
  encoding: string;
  assigned_to_type: string | null;
  assigned_to_id: number | null;
  auto_print: boolean;
  print_delay_ms: number;
  is_active: boolean;
  test_status: string | null;
  created_at: string;
  branches?: { name: string } | null;
}

interface Branch {
  id: number;
  name: string;
}

interface PrinterConfigTabProps {
  initialPrinters: PrinterConfigRow[];
  branches: Branch[];
}

export function PrinterConfigTab({ initialPrinters, branches }: PrinterConfigTabProps) {
  const [printers, setPrinters] = useState(initialPrinters);
  const [showAdd, setShowAdd] = useState(false);
  const [editPrinter, setEditPrinter] = useState<PrinterConfigRow | null>(null);
  const [newPrinterType, setNewPrinterType] = useState<PrinterType>("browser");
  const [editPrinterType, setEditPrinterType] = useState<PrinterType>("browser");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDialogOpenChange(open: boolean) {
    setShowAdd(open);
    if (!open) setNewPrinterType("browser");
  }

  function handleEditOpen(printer: PrinterConfigRow) {
    setEditPrinter(printer);
    setEditPrinterType(printer.type as PrinterType);
    setError(null);
  }

  function handleEditClose() {
    setEditPrinter(null);
    setEditPrinterType("browser");
  }

  function buildConnectionConfig(formData: FormData, type: PrinterType): { ok: true; config: Record<string, unknown> } | { ok: false; error: string } {
    let config: Record<string, unknown> = {};
    if (type === "thermal_usb") {
      const vendorId = Number(formData.get("vendor_id"));
      const productId = Number(formData.get("product_id"));
      if (!vendorId || !productId) {
        return { ok: false, error: "Vui lòng nhập Vendor ID và Product ID cho máy in USB." };
      }
      config = { vendor_id: vendorId, product_id: productId };
    } else if (type === "thermal_network") {
      const host = (formData.get("host") as string | null)?.trim();
      const port = Number(formData.get("port")) || 9100;
      const protocol = (formData.get("protocol") as string) || "http";
      if (!host) {
        return { ok: false, error: "Vui lòng nhập địa chỉ IP máy in." };
      }
      config = { host, port, protocol };
    }
    return { ok: true, config };
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    const type = formData.get("type") as PrinterType;
    const result = buildConnectionConfig(formData, type);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formData.set("connection_config", JSON.stringify(result.config));

    startTransition(async () => {
      const res = await createPrinterConfig(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setShowAdd(false);
        window.location.reload();
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPrinter) return;
    const formData = new FormData(e.currentTarget);
    setError(null);

    const type = formData.get("type") as PrinterType;
    const result = buildConnectionConfig(formData, type);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formData.set("connection_config", JSON.stringify(result.config));
    formData.set("id", String(editPrinter.id));

    startTransition(async () => {
      const res = await updatePrinterConfig(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        handleEditClose();
        window.location.reload();
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Xóa cấu hình máy in này?")) return;
    const formData = new FormData();
    formData.set("id", String(id));

    startTransition(async () => {
      const result = await deletePrinterConfig(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setPrinters((prev) => prev.filter((p) => p.id !== id));
      }
    });
  }

  function handleToggleAutoPrint(id: number, value: boolean) {
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("auto_print", String(value));

    startTransition(async () => {
      const result = await updatePrinterConfig(formData);
      if (!result?.error) {
        setPrinters((prev) =>
          prev.map((p) => (p.id === id ? { ...p, auto_print: value } : p)),
        );
      } else {
        setError(result.error);
      }
    });
  }

  function getTestStatusVariant(
    status: string | null,
  ): "default" | "destructive" | "secondary" {
    if (status === "connected") return "default";
    if (status === "error") return "destructive";
    return "secondary";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Printer className="size-5" />
          Quản lý máy in
        </CardTitle>
        <Button onClick={() => setShowAdd(true)} className="gap-2" disabled={branches.length === 0}>
          <Plus className="size-4" />
          Thêm máy in
        </Button>
      </CardHeader>
      <CardContent>
        {branches.length === 0 && (
          <div role="alert" className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trước khi thêm máy in.
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {printers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Chưa có máy in nào được cấu hình. Nhấn &quot;Thêm máy in&quot; để bắt đầu.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Gán cho</TableHead>
                <TableHead>Khổ giấy</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tự động in</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((printer) => (
                <TableRow key={printer.id}>
                  <TableCell className="font-medium">{printer.name}</TableCell>
                  <TableCell>{printer.branches?.name ?? "—"}</TableCell>
                  <TableCell>{getPrinterTypeLabel(printer.type)}</TableCell>
                  <TableCell>
                    {printer.assigned_to_type ? (
                      <span>
                        {getPrinterAssignedTypeLabel(printer.assigned_to_type)}{" "}
                        #{printer.assigned_to_id}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Chưa gán</span>
                    )}
                  </TableCell>
                  <TableCell>{printer.paper_width_mm}mm</TableCell>
                  <TableCell>
                    <Badge variant={getTestStatusVariant(printer.test_status)}>
                      {getPrinterTestStatusLabel(printer.test_status ?? "untested")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={printer.auto_print}
                      onCheckedChange={(val) =>
                        handleToggleAutoPrint(printer.id, val)
                      }
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditOpen(printer)}
                        disabled={isPending}
                        aria-label={`Sửa máy in ${printer.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(printer.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Printer Dialog */}
      <Dialog open={showAdd} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm máy in mới</DialogTitle>
            <DialogDescription>
              Cấu hình kết nối máy in nhiệt cho POS hoặc bếp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="branch_id">Chi nhánh</Label>
                <Select name="branch_id" defaultValue={branches[0]?.id?.toString()}>
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
                <Label htmlFor="name">Tên máy in</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Máy in thu ngân 1"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Loại kết nối</Label>
                <Select
                  name="type"
                  defaultValue="browser"
                  onValueChange={(v) => setNewPrinterType(v as PrinterType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">In qua trình duyệt</SelectItem>
                    <SelectItem value="thermal_usb">Máy in USB (WebUSB)</SelectItem>
                    <SelectItem value="thermal_network">Máy in mạng (IP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newPrinterType === "thermal_usb" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor_id">Vendor ID (số thập phân)</Label>
                    <Input id="vendor_id" name="vendor_id" type="number" placeholder="vd: 1208 (0x04b8 — Epson)" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="product_id">Product ID (số thập phân)</Label>
                    <Input id="product_id" name="product_id" type="number" placeholder="vd: 514 (0x0202)" required />
                  </div>
                </>
              )}

              {newPrinterType === "thermal_network" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="host">Địa chỉ IP máy in</Label>
                    <Input id="host" name="host" placeholder="vd: 192.168.1.100" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="port">Cổng</Label>
                    <Input id="port" name="port" type="number" defaultValue="9100" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="protocol">Giao thức</Label>
                    <Select name="protocol" defaultValue="http">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="tcp">TCP (raw)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="paper_width_mm">Khổ giấy</Label>
                <Select name="paper_width_mm" defaultValue="80">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80mm (phổ biến)</SelectItem>
                    <SelectItem value="58">58mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="print_delay_ms">Độ trễ in (ms)</Label>
                <Input id="print_delay_ms" name="print_delay_ms" type="number" defaultValue="500" min={0} max={5000} />
              </div>

              <input type="hidden" name="encoding" value="utf-8" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang tạo..." : "Tạo máy in"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Printer Dialog */}
      <Dialog open={!!editPrinter} onOpenChange={(open) => { if (!open) handleEditClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa máy in</DialogTitle>
            <DialogDescription>
              Thay đổi cấu hình kết nối và format in.
            </DialogDescription>
          </DialogHeader>
          {editPrinter && (
            <form onSubmit={handleEdit} key={editPrinter.id}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Tên máy in</Label>
                  <Input id="edit-name" name="name" defaultValue={editPrinter.name} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Loại kết nối</Label>
                  <Select name="type" defaultValue={editPrinter.type} onValueChange={(v) => setEditPrinterType(v as PrinterType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser">In qua trình duyệt</SelectItem>
                      <SelectItem value="thermal_usb">Máy in USB (WebUSB)</SelectItem>
                      <SelectItem value="thermal_network">Máy in mạng (IP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editPrinterType === "thermal_usb" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-vendor">Vendor ID</Label>
                      <Input id="edit-vendor" name="vendor_id" type="number" defaultValue={editPrinter.connection_config.vendor_id != null ? String(editPrinter.connection_config.vendor_id) : ""} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-product">Product ID</Label>
                      <Input id="edit-product" name="product_id" type="number" defaultValue={editPrinter.connection_config.product_id != null ? String(editPrinter.connection_config.product_id) : ""} required />
                    </div>
                  </>
                )}

                {editPrinterType === "thermal_network" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-host">Địa chỉ IP</Label>
                      <Input id="edit-host" name="host" defaultValue={(editPrinter.connection_config.host as string) ?? ""} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-port">Cổng</Label>
                      <Input id="edit-port" name="port" type="number" defaultValue={editPrinter.connection_config.port != null ? String(editPrinter.connection_config.port) : "9100"} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-protocol">Giao thức</Label>
                      <Select name="protocol" defaultValue={(editPrinter.connection_config.protocol as string) ?? "http"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http">HTTP</SelectItem>
                          <SelectItem value="tcp">TCP (raw)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="edit-paper">Khổ giấy</Label>
                  <Select name="paper_width_mm" defaultValue={String(editPrinter.paper_width_mm)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80">80mm (phổ biến)</SelectItem>
                      <SelectItem value="58">58mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-encoding">Encoding</Label>
                  <Input id="edit-encoding" name="encoding" defaultValue={editPrinter.encoding} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-delay">Độ trễ in (ms)</Label>
                  <Input id="edit-delay" name="print_delay_ms" type="number" defaultValue={editPrinter.print_delay_ms} min={0} max={5000} />
                </div>

                <div className="flex items-center gap-2">
                  <Switch id="edit-auto-print" name="auto_print_toggle" defaultChecked={editPrinter.auto_print} onCheckedChange={(val) => {
                    const hidden = document.getElementById("edit-auto-print-hidden") as HTMLInputElement;
                    if (hidden) hidden.value = String(val);
                  }} />
                  <Label htmlFor="edit-auto-print">Tự động in</Label>
                  <input type="hidden" id="edit-auto-print-hidden" name="auto_print" defaultValue={String(editPrinter.auto_print)} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleEditClose}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
