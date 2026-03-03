"use client";

import Link from "next/link";
import { BookOpen, ClipboardList, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const actionCards = [
  {
    href: "/customer/menu",
    icon: BookOpen,
    label: "Thuc don",
    description: "Xem thuc don nha hang",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    href: "/customer/orders",
    icon: ClipboardList,
    label: "Don hang",
    description: "Lich su don hang cua ban",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    href: "/customer/loyalty",
    icon: Gift,
    label: "Diem thuong",
    description: "Tich diem va uu dai",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
];

export function CustomerHome() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Chao mung den Com Tam Ma Tu!</h1>
        <p className="text-muted-foreground text-sm">Chuc ban ngon mieng!</p>
      </div>

      {/* Action cards */}
      <div className="grid gap-3">
        {actionCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <span className="font-medium">{card.label}</span>
                  <p className="text-muted-foreground text-sm">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
