"use client";

import Link from "next/link";
import { BookOpen, ClipboardList, Gift, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@comtammatu/shared";

interface CustomerHomeProps {
  isLoggedIn: boolean;
  customerName: string | null;
  loyaltyTierName: string | null;
  loyaltyPoints: number;
}

const actionCards = [
  {
    href: "/customer/menu",
    icon: BookOpen,
    label: "Thuc don",
    description: "Xem thuc don nha hang",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    href: "/customer/orders",
    icon: ClipboardList,
    label: "Don hang",
    description: "Lich su don hang cua ban",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    authRequired: true,
  },
  {
    href: "/customer/loyalty",
    icon: Gift,
    label: "Diem thuong",
    description: "Tich diem va uu dai",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    authRequired: true,
  },
];

export function CustomerHome({
  isLoggedIn,
  customerName,
  loyaltyTierName,
  loyaltyPoints,
}: CustomerHomeProps) {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {isLoggedIn && customerName
            ? `Xin chao, ${customerName}!`
            : "Chao mung den Com Tam Ma Tu!"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isLoggedIn
            ? "Chuc ban ngon mieng!"
            : "Dang nhap de xem don hang va tich diem."}
        </p>
      </div>

      {/* Loyalty badge — only show when logged in with tier info */}
      {isLoggedIn && loyaltyTierName && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <Award className="text-primary h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{loyaltyTierName}</span>
                <Badge variant="secondary" className="text-xs">
                  {formatPoints(loyaltyPoints)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Hang thanh vien hien tai
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action cards */}
      <div className="grid gap-3">
        {actionCards.map((card) => {
          const isDisabled = card.authRequired && !isLoggedIn;

          if (isDisabled) {
            return (
              <Link key={card.href} href="/login">
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
                        Dang nhap de xem
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          }

          return (
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
          );
        })}
      </div>

      {/* Login CTA for unauthenticated users */}
      {!isLoggedIn && (
        <div className="text-center">
          <Link
            href="/login"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Dang nhap / Dang ky
          </Link>
        </div>
      )}
    </div>
  );
}
