"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@comtammatu/database/src/supabase/client";
import { Monitor, Loader2, CheckCircle, XCircle } from "lucide-react";
import { checkDeviceStatus } from "./actions";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@comtammatu/ui";

interface DevicePendingApprovalProps {
  approvalCode: string;
  deviceId: number;
  role: string;
}

function getRoleRedirectPath(role: string): string {
  if (role === "cashier" || role === "waiter") return "/pos";
  if (role === "chef") return "/kds";
  return "/pos";
}

export function DevicePendingApproval({
  approvalCode,
  deviceId,
  role,
}: DevicePendingApprovalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  // Guard against duplicate redirects from realtime + polling race
  const handledRef = useRef(false);

  const handleApproved = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    setStatus("approved");
    setTimeout(() => {
      router.push(getRoleRedirectPath(role));
    }, 1500);
  }, [role, router]);

  const handleRejected = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    setStatus("rejected");
  }, []);

  // Subscribe to realtime changes on this device
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`device-approval-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "registered_devices",
          filter: `id=eq.${deviceId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === "approved") {
            handleApproved();
          } else if (updated.status === "rejected") {
            handleRejected();
          }
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds in case realtime misses
    const pollInterval = setInterval(async () => {
      if (handledRef.current) return;
      const result = await checkDeviceStatus(deviceId);
      if (result.status === "approved") {
        handleApproved();
      } else if (result.status === "rejected") {
        handleRejected();
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [deviceId, handleApproved, handleRejected]);

  if (status === "approved") {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle className="size-8" />
          </div>
          <CardTitle className="text-xl font-bold text-green-700">
            Thiết bị đã được duyệt!
          </CardTitle>
          <CardDescription>Đang chuyển hướng...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "rejected") {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="size-8" />
          </div>
          <CardTitle className="text-xl font-bold text-red-700">Thiết bị bị từ chối</CardTitle>
          <CardDescription>
            Quản lý đã từ chối thiết bị này. Vui lòng liên hệ quản lý.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              handledRef.current = false;
              window.location.reload();
            }}
          >
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pending state — show approval code
  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Monitor className="size-8" />
        </div>
        <CardTitle className="text-xl font-bold">Thiết bị mới</CardTitle>
        <CardDescription>Báo mã này cho quản lý để duyệt thiết bị</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-8 py-6">
            <p className="text-center font-mono text-4xl font-bold tracking-[0.3em] text-primary">
              {approvalCode}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Đang chờ quản lý duyệt...</span>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Khi quản lý duyệt thiết bị, bạn sẽ được tự động chuyển đến trang làm việc.
        </p>
      </CardContent>
    </Card>
  );
}
