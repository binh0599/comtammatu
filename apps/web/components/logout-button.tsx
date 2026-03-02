"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors",
          className,
        )}
        aria-label="Đăng xuất"
      >
        <LogOut className="h-5 w-5" />
        <span>Đăng xuất</span>
      </button>
    </form>
  );
}
