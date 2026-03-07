"use client";

import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  async function handleToggle() {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success("Đã tắt thông báo đẩy");
      else toast.error("Không thể tắt thông báo");
    } else {
      const ok = await subscribe();
      if (ok) toast.success("Đã bật thông báo đẩy");
      else if (permission === "denied") {
        toast.error("Bạn đã chặn thông báo. Vui lòng bật lại trong cài đặt trình duyệt.");
      } else {
        toast.error("Không thể bật thông báo");
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Thông báo đẩy</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-4 w-4 text-green-600" />
            ) : (
              <BellOff className="text-muted-foreground h-4 w-4" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isSubscribed ? "Đang bật" : "Đã tắt"}
              </p>
              <p className="text-muted-foreground text-xs">
                {isSubscribed
                  ? "Nhận thông báo về đơn hàng, ưu đãi"
                  : "Bật để nhận thông báo khi có ưu đãi mới"}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? "outline" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={isLoading || permission === "denied"}
          >
            {isLoading ? "..." : isSubscribed ? "Tắt" : "Bật"}
          </Button>
        </div>
        {permission === "denied" && (
          <p className="text-destructive mt-2 text-xs">
            Thông báo đã bị chặn. Vui lòng cho phép trong cài đặt trình duyệt.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
