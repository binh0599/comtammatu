"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CloudUpload,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  getPendingOrders,
  removePendingOrder,
  clearPendingOrders,
  type PendingOrder,
} from "../lib/offline-db";
import { syncPendingOrders } from "../lib/offline-queue";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Badge, Button } from "@comtammatu/ui";

export function PendingOrdersClient() {
  const isOnline = useOnlineStatus();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const pending = await getPendingOrders();
      pending.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(pending);
    } catch {
      toast.error("Không thể tải danh sách đơn chờ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleSync() {
    if (!isOnline) {
      toast.error("Không có kết nối mạng");
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncPendingOrders();
      if (result.synced > 0) {
        toast.success(`Đã đồng bộ ${result.synced} đơn hàng`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} đơn không đồng bộ được`);
      }
      if (result.synced === 0 && result.failed === 0) {
        toast.info("Không có đơn nào cần đồng bộ");
      }
    } catch {
      toast.error("Lỗi khi đồng bộ");
    } finally {
      setIsSyncing(false);
      await loadOrders();
    }
  }

  async function handleDiscard(clientId: string) {
    try {
      await removePendingOrder(clientId);
      toast.success("Đã xóa đơn chờ");
      await loadOrders();
    } catch {
      toast.error("Không thể xóa");
    }
  }

  async function handleClearAll() {
    try {
      await clearPendingOrders();
      toast.success("Đã xóa tất cả đơn chờ");
      setOrders([]);
    } catch {
      toast.error("Không thể xóa");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Không có đơn chờ đồng bộ</p>
        <p className="text-muted-foreground text-sm mt-1">
          Tất cả đơn hàng đã được gửi thành công
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          size="sm"
          className="gap-1.5"
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          {isSyncing ? "Đang đồng bộ..." : `Đồng bộ ${orders.length} đơn`}
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Xóa tất cả
        </Button>
        {!isOnline && (
          <Badge variant="destructive" className="ml-auto gap-1">
            Ngoại tuyến
          </Badge>
        )}
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.clientId}
            className="rounded-lg border p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {order.payload.type === "dine_in"
                      ? `Tại bàn #${order.payload.table_id}`
                      : "Mang đi"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {order.payload.items.length} món
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(order.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
              <Button
                onClick={() => handleDiscard(order.clientId)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                aria-label="Xóa đơn"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Items summary */}
            <div className="text-sm text-muted-foreground">
              {order.payload.items.map((item, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {item.quantity}x #{item.menu_item_id}
                </span>
              ))}
            </div>

            {/* Error state */}
            {order.lastError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {order.lastError}
                <span className="text-muted-foreground">
                  ({order.attempts} lần thử)
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
