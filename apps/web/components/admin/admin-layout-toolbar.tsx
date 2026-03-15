"use client";

import { NotificationBadge } from "@/app/(admin)/admin/notifications/notification-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator, SidebarTrigger } from "@comtammatu/ui";

export function AdminLayoutToolbar() {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBadge />
      </div>
    </div>
  );
}
