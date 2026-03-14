"use client";

import { useState, useTransition } from "react";
import { Plus, Printer, Trash2, Usb } from "lucide-react";
import { getPrinterTypeLabel, getPrinterTestStatusLabel } from "@comtammatu/shared";
import { toast } from "sonner";
import { createPrinter, deletePrinter, updatePrinter } from "./actions";
import { useSerialPrinter } from "@/app/(kds)/kds/hooks/use-serial-printer";
import { buildPosReceipt } from "@/app/(kds)/kds/lib/escpos";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

type PrinterType = "browser" | "thermal_usb" | "thermal_network";

interface PrinterConfigRow {
  id: number;
  name: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection_config: any;
  paper_width_mm: number;
  assigned_to_type: string | null;
  assigned_to_id: number | null;
  auto_print: boolean;
  print_delay_ms: number;
  is_active: boolean;
  test_status: string | null;
}

export function PrinterSettings({
  initialPrinters,
  terminalId,
  terminalName,
}: {
  initialPrinters: PrinterConfigRow[];
  terminalId: number;
  terminalName: string;
}) {
  const [printers, setPrinters] = useState(initialPrinters);
  const [showAdd, setShowAdd] = useState(false);
  const [newPrinterType, setNewPrinterType] = useState<PrinterType>("browser");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const serialPrinter = useSerialPrinter();

  async function handleSerialTestPrint() {
    try {
      const testReceipt = buildPosReceipt({
        storeName: "COM TAM MA TU",
        branchName: "Chi nhánh test",
        orderNumber: "TEST-001",
        tableNumber: "1",
        items: [
          { quantity: 2, name: "Cơm tấm sườn bì chả", price: 45000, total: 90000 },
          { quantity: 1, name: "Nước mía", price: 15000, total: 15000 },
        ],
        subtotal: 105000,
        tax: 0,
        serviceCharge: 0,
        total: 105000,
        paymentMethod: "cash",
        cashierName: "Test",
        createdAt: new Date().toISOString(),
        paperWidth: 80,
      });
      await serialPrinter.print(testReceipt);
      toast.success("Đã in thử thành công!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi in thử";
      toast.error(msg);
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    const type = formData.get("type") as PrinterType;
    let connectionConfig: Record<string, unknown> = {};
    if (type === "thermal_usb") {
      const vendorId = Number(formData.get("vendor_id"));
      const productId = Number(formData.get("product_id"));
      if (!vendorId || !productId) {
        setError("Vui lòng nhập Vendor ID và Product ID.");
        return;
      }
      connectionConfig = { vendor_id: vendorId, product_id: productId };
    } else if (type === "thermal_network") {
      const host = (formData.get("host") as string | null)?.trim();
      const port = Number(formData.get("port")) || 9100;
      const protocol = (formData.get("protocol") as string) || "http";
      if (!host) {
        setError("Vui lòng nhập địa chỉ IP máy in.");
        return;
      }
      connectionConfig = { host, port, protocol };
    }
    formData.set("connection_config", JSON.stringify(connectionConfig));
    formData.set("assigned_to_type", "pos_terminal");
    formData.set("assigned_to_id", String(terminalId));

    startTransition(async () => {
      const result = await createPrinter(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowAdd(false);
        window.location.reload();
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Xóa cấu hình máy in này?")) return;
    const formData = new FormData();
    formData.set("id", String(id));

    startTransition(async () => {
      const result = await deletePrinter(formData);
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
      const result = await updatePrinter(formData);
      if (!result?.error) {
        setPrinters((prev) => prev.map((p) => (p.id === id ? { ...p, auto_print: value } : p)));
      } else {
        setError(result.error);
      }
    });
  }

  function getTestStatusVariant(status: string | null): "default" | "destructive" | "secondary" {
    if (status === "connected") return "default";
    if (status === "error") return "destructive";
    return "secondary";
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Máy in
          </CardTitle>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="size-4" />
            Thêm máy in
          </Button>
        </CardHeader>
        <CardContent>
          {/* Web Serial API Connection */}
          {serialPrinter.isSupported && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border p-3">
              <Usb className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Web Serial (ESC/POS)</p>
                <p className="text-xs text-muted-foreground">
                  Kết nối máy in nhiệt qua cổng Serial
                </p>
              </div>
              <Badge
                variant={
                  serialPrinter.status === "connected"
                    ? "default"
                    : serialPrinter.status === "error"
                      ? "destructive"
                      : "secondary"
                }
              >
                {serialPrinter.status === "connected"
                  ? "Đã kết nối"
                  : serialPrinter.status === "connecting"
                    ? "Đang kết nối..."
                    : serialPrinter.status === "error"
                      ? "Lỗi"
                      : "Chưa kết nối"}
              </Badge>
              {serialPrinter.status === "connected" ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSerialTestPrint}>
                    In thử
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => serialPrinter.disconnect()}>
                    Ngắt kết nối
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => serialPrinter.connect()}
                  disabled={serialPrinter.status === "connecting"}
                >
                  Kết nối
                </Button>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {printers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có máy in nào. Nhấn &quot;Thêm máy in&quot; để bắt đầu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Khổ giấy</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tự động in</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printers.map((printer) => (
                    <TableRow key={printer.id}>
                      <TableCell className="font-medium">{printer.name}</TableCell>
                      <TableCell>{getPrinterTypeLabel(printer.type)}</TableCell>
                      <TableCell>{printer.paper_width_mm}mm</TableCell>
                      <TableCell>
                        <Badge variant={getTestStatusVariant(printer.test_status)}>
                          {getPrinterTestStatusLabel(printer.test_status ?? "untested")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={printer.auto_print}
                          onCheckedChange={(val) => handleToggleAutoPrint(printer.id, val)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(printer.id)}
                          disabled={isPending}
                          aria-label={`Xóa máy in ${printer.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Printer Dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) setNewPrinterType("browser");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm máy in mới</DialogTitle>
            <DialogDescription>Thêm máy in kết nối với thiết bị {terminalName}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên máy in</Label>
                <Input id="name" name="name" placeholder="Máy in quầy 1" required />
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
                    <Label htmlFor="vendor_id">Vendor ID</Label>
                    <Input
                      id="vendor_id"
                      name="vendor_id"
                      type="number"
                      placeholder="1208"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="product_id">Product ID</Label>
                    <Input
                      id="product_id"
                      name="product_id"
                      type="number"
                      placeholder="514"
                      required
                    />
                  </div>
                </>
              )}

              {newPrinterType === "thermal_network" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="host">Địa chỉ IP</Label>
                    <Input id="host" name="host" placeholder="192.168.1.100" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="port">Cổng</Label>
                    <Input id="port" name="port" type="number" defaultValue="9100" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="protocol">Giao thức</Label>
                    <Select name="protocol" defaultValue="http">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="raw">Raw TCP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="paper_width_mm">Khổ giấy</Label>
                <Select name="paper_width_mm" defaultValue="80">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80mm</SelectItem>
                    <SelectItem value="58">58mm</SelectItem>
                  </SelectContent>
                </Select>
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
    </>
  );
}
