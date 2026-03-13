"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Monitor, CalendarOff, Wallet, UserCircle } from "lucide-react";
import { cn } from "@comtammatu/ui";

const navItems = [
  { href: "/employee", icon: Home, label: "Chính" },
  { href: "/employee/schedule", icon: CalendarDays, label: "Ca làm" },
  { href: "/employee/workspace", icon: Monitor, label: "POS/KDS" },
  { href: "/employee/leave", icon: CalendarOff, label: "Nghỉ phép" },
  { href: "/employee/payroll", icon: Wallet, label: "Lương" },
  { href: "/employee/profile", icon: UserCircle, label: "Cá nhân" },
];

export function EmployeeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Employee navigation" className="bg-background fixed bottom-0 left-0 right-0 z-50 border-t">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/employee" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
