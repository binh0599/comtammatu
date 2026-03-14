"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { getUnreadNotificationCount } from "./actions";
import { toast } from "sonner";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@comtammatu/ui";

export function NotificationBadge() {
  const [count, setCount] = useState(0);
  const { isSubscribed, isLoading, isSupported, subscribe, unsubscribe, permission } =
    usePushNotifications();

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const result = await getUnreadNotificationCount();
        if (!cancelled) {
          setCount(result);
        }
      } catch {
        // Silently fail — badge is non-critical UI
      }
    }

    void fetchCount();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePushToggle() {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success("Đã tắt thông báo đẩy");
    } else {
      const ok = await subscribe(["order_status", "low_stock", "system"]);
      if (ok) toast.success("Đã bật thông báo đẩy");
      else if (permission === "denied") {
        toast.error("Thông báo bị chặn. Vui lòng bật trong cài đặt trình duyệt.");
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Thông báo"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <Link
            href="/admin/notifications"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Bell className="size-4" />
            <span>Xem cảnh báo kho hàng</span>
            {count > 0 && <span className="ml-auto text-xs font-medium text-red-600">{count}</span>}
          </Link>

          {isSupported && (
            <div className="border-t pt-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <BellRing className="size-4" />
                  <span className="text-sm">Thông báo đẩy</span>
                </div>
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handlePushToggle}
                  disabled={isLoading || permission === "denied"}
                >
                  {isLoading ? "..." : isSubscribed ? "Tắt" : "Bật"}
                </Button>
              </div>
              {permission === "denied" && (
                <p className="text-destructive mt-1 px-2 text-xs">Đã chặn trong trình duyệt</p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
