"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Trash2, Wifi } from "lucide-react";
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
import { createClient } from "@comtammatu/database/src/supabase/client";
import { approveDevice, rejectDevice, deleteDevice } from "./actions";
import { toast } from "sonner";
import { formatDateTime } from "@comtammatu/shared";

interface RegisteredDevice {
  id: number;
  tenant_id: number;
  branch_id: number;
  device_fingerprint: string;
  device_name: string;
  approval_code: string;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  device_type: string | null;
  terminal_type: string | null;
  registered_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  branches: { name: string } | null;
  profiles: { full_name: string | null; role: string } | null;
}

function getTerminalTypeLabel(type: string | null) {
  switch (type) {
    case "mobile_order":
      return <Badge variant="outline">POS - Gọi món</Badge>;
    case "cashier_station":
      return <Badge variant="outline">POS - Thu ngân</Badge>;
    case "kds_station":
      return <Badge variant="outline">KDS - Bếp</Badge>;
    default:
      return <Badge variant="secondary">—</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Chờ duyệt</Badge>;
    case "approved":
      return <Badge variant="default" className="bg-green-100 text-green-700">Đã duyệt</Badge>;
    case "rejected":
      return <Badge variant="destructive">Từ chối</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}


export function DevicesTable({
  initialDevices,
  tenantId,
}: {
  initialDevices: RegisteredDevice[];
  tenantId: number;
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Subscribe to realtime for new device registrations
  const handleRealtimeChange = useCallback(() => {
    // On any change, reload to get fresh data
    window.location.reload();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-devices")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "registered_devices",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newDevice = payload.new as RegisteredDevice;
          if (newDevice.status === "pending") {
            toast.info("Thiết bị mới cần duyệt!", {
              description: `Mã: ${newDevice.approval_code}`,
              duration: 10000,
            });
          }
          handleRealtimeChange();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "registered_devices",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const updated = payload.new as RegisteredDevice;
          setDevices((prev) =>
            prev.map((d) =>
              d.id === updated.id ? { ...d, status: updated.status, approved_at: updated.approved_at, rejected_at: updated.rejected_at } : d,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "registered_devices",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: number };
          setDevices((prev) => prev.filter((d) => d.id !== deleted.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, handleRealtimeChange]);

  async function handleApprove(id: number) {
    startTransition(async () => {
      const result = await approveDevice(id);
      if (result.error) {
        setError(result.error);
      } else {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: "approved", approved_at: new Date().toISOString() }
              : d,
          ),
        );
        setError(null);
      }
    });
  }

  async function handleReject(id: number) {
    startTransition(async () => {
      const result = await rejectDevice(id);
      if (result.error) {
        setError(result.error);
      } else {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: "rejected", rejected_at: new Date().toISOString() }
              : d,
          ),
        );
        setError(null);
      }
    });
  }

  async function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteDevice(id);
      if (result.error) {
        setError(result.error);
      } else {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        setError(null);
      }
    });
  }

  const pendingDevices = devices.filter((d) => d.status === "pending");
  const otherDevices = devices.filter((d) => d.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending devices — highlighted section */}
      {pendingDevices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-orange-500 animate-pulse" />
            <h3 className="text-lg font-semibold text-orange-700">
              Thiết bị chờ duyệt ({pendingDevices.length})
            </h3>
          </div>
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Mã duyệt</TableHead>
                  <TableHead scope="col">Nhân viên</TableHead>
                  <TableHead scope="col">Thiết bị</TableHead>
                  <TableHead scope="col">Loại</TableHead>
                  <TableHead scope="col">Chi nhánh</TableHead>
                  <TableHead scope="col">IP</TableHead>
                  <TableHead scope="col">Thời gian</TableHead>
                  <TableHead scope="col" className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <span className="font-mono text-lg font-bold tracking-wider text-primary">
                        {device.approval_code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {device.profiles?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {device.profiles?.role ?? ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{device.device_name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {device.device_fingerprint.slice(0, 8)}...
                      </p>
                    </TableCell>
                    <TableCell>{getTerminalTypeLabel(device.terminal_type)}</TableCell>
                    <TableCell>{device.branches?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {device.ip_address ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(device.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleApprove(device.id)}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-4 w-4" aria-hidden="true" />
                          Duyệt
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleReject(device.id)}
                          disabled={isPending}
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Từ chối
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* All devices history */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Thiết bị đã đăng ký</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Thiết bị</TableHead>
                <TableHead scope="col">Nhân viên</TableHead>
                <TableHead scope="col">Loại</TableHead>
                <TableHead scope="col">Chi nhánh</TableHead>
                <TableHead scope="col">IP</TableHead>
                <TableHead scope="col">Trạng thái</TableHead>
                <TableHead scope="col">Ngày đăng ký</TableHead>
                <TableHead scope="col" className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherDevices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Chưa có thiết bị đã xử lý
                  </TableCell>
                </TableRow>
              ) : (
                otherDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{device.device_name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {device.device_fingerprint.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.profiles?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>{getTerminalTypeLabel(device.terminal_type)}</TableCell>
                    <TableCell>{device.branches?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {device.ip_address ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(device.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Xóa thiết bị"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa thiết bị
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa thiết bị này? Nhân viên sẽ
                              phải đăng ký lại khi đăng nhập từ thiết bị này.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(device.id)}
                            >
                              Xóa
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
    </div>
  );
}
