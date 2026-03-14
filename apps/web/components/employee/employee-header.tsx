"use client";

import { BadgeCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/role-labels";

interface EmployeeHeaderProps {
  employeeName: string;
  role: string;
}

export function EmployeeHeader({ employeeName, role }: EmployeeHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="text-primary h-5 w-5" />
          <span className="text-sm font-semibold truncate max-w-[180px]">{employeeName}</span>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-3 py-0.5 text-xs font-medium">
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>
    </header>
  );
}
