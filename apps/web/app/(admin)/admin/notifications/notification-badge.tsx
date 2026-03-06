"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getUnreadNotificationCount } from "./actions";

export function NotificationBadge() {
  const [count, setCount] = useState(0);

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

  return (
    <Link
      href="/admin/notifications"
      className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Thông báo kho hàng"
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
