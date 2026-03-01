"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/pos", icon: LayoutGrid, label: "Bàn" },
  { href: "/pos/order/new", icon: PlusCircle, label: "Tạo đơn" },
  { href: "/pos/orders", icon: ClipboardList, label: "Đơn hàng" },
  { href: "/pos/session", icon: User, label: "Ca làm" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed bottom-0 left-0 right-0 z-50 border-t">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/pos" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-xs",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
