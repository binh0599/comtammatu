"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardList, User, Printer, LogOut } from "lucide-react";
import { cn } from "@comtammatu/ui";
import { logout } from "@/app/login/actions";
import { NotificationBell } from "@/components/pos/notification-bell";

const navItems = [
  { href: "/pos", icon: LayoutGrid, label: "Bàn" },
  { href: "/pos/orders", icon: ClipboardList, label: "Đơn hàng" },
  { href: "/pos/session", icon: User, label: "Ca làm" },
  { href: "/pos/printer", icon: Printer, label: "Máy in" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="POS navigation"
      className="bg-background fixed bottom-0 left-0 right-0 z-50 border-t"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/pos" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-xs",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {/* Notification Bell */}
        <NotificationBell />
        <form action={logout} className="flex-1">
          <button
            type="submit"
            className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
            <span>Thoát</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
