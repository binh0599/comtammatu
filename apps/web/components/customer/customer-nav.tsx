"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/customer", icon: Home, label: "Trang chu" },
  { href: "/customer/menu", icon: BookOpen, label: "Thuc don" },
  { href: "/customer/orders", icon: ClipboardList, label: "Don hang" },
  { href: "/customer/account", icon: User, label: "Tai khoan" },
];

export function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed bottom-0 left-0 right-0 z-50 border-t">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/customer" && pathname.startsWith(item.href));

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
