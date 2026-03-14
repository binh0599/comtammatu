"use client";

import { useState, useTransition } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { getPrinterTypeLabel, getPrinterTestStatusLabel } from "@comtammatu/shared";
import { createPrinter, deletePrinter, updatePrinter } from "./actions";
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

export function KdsPrinterSettings({
  initialPrinters,
  stationId,
  stationName,
}: {
  initialPrinters: PrinterConfigRow[];
  stationId: number;
  stationName: string;
}) {
  const [printers, setPrinters] = useState(initialPrinters);
  const [showAdd, setShowAdd] = useState(false);
  const [newPrinterType, setNewPrinterType] = useState<PrinterType>("browser");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    formData.set("assigned_to_id", String(stationId));

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
            Máy in KDS
          </CardTitle>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="size-4" />
            Thêm máy in
          </Button>
        </CardHeader>
        <CardContent>
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

      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) setNewPrinterType("browser");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm máy in KDS</DialogTitle>
            <DialogDescription>Thêm máy in kết nối với trạm {stationName}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên máy in</Label>
                <Input id="name" name="name" placeholder="Máy in bếp 1" required />
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
                    <SelectItem value="thermal_usb">USB (WebUSB)</SelectItem>
                    <SelectItem value="thermal_network">Mạng (IP)</SelectItem>
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
