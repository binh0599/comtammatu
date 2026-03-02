"use client";

import { Award, TrendingUp, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatPrice,
  formatDateTime,
  formatPoints,
  getLoyaltyTransactionTypeLabel,
} from "@comtammatu/shared";

interface LoyaltyTransaction {
  id: number;
  type: string;
  points: number;
  balance_after: number | null;
  reference_type: string | null;
  created_at: string;
}

interface LoyaltyData {
  currentPoints: number;
  tierName: string | null;
  tierDiscountPct: number | null;
  tierMinPoints: number;
  nextTier: { name: string; min_points: number } | null;
  transactions: LoyaltyTransaction[];
  totalSpent: number;
  totalVisits: number;
}

interface LoyaltyDashboardProps {
  loyalty: LoyaltyData;
}

function getTransactionBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "earn":
      return "default";
    case "redeem":
      return "destructive";
    case "expire":
      return "secondary";
    case "adjust":
      return "outline";
    default:
      return "outline";
  }
}

export function LoyaltyDashboard({ loyalty }: LoyaltyDashboardProps) {
  const {
    currentPoints,
    tierName,
    tierDiscountPct,
    nextTier,
    transactions,
    totalSpent,
    totalVisits,
  } = loyalty;

  // Progress calculation
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.round((currentPoints / nextTier.min_points) * 100)
      )
    : 100;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Diem thuong</h1>

      {/* Tier card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
              <Award className="text-primary h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {tierName ?? "Thanh vien"}
                </span>
                {tierDiscountPct != null && tierDiscountPct > 0 && (
                  <Badge variant="secondary">Giam {tierDiscountPct}%</Badge>
                )}
              </div>
              <p className="text-primary text-2xl font-bold">
                {new Intl.NumberFormat("vi-VN").format(currentPoints)} diem
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Hang tiep theo: {nextTier.name}
                </span>
                <span className="text-muted-foreground">
                  {new Intl.NumberFormat("vi-VN").format(currentPoints)}/
                  {new Intl.NumberFormat("vi-VN").format(nextTier.min_points)}
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingBag className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-lg font-bold">{totalVisits}</p>
              <p className="text-muted-foreground text-xs">Lan ghe tham</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-lg font-bold">{formatPrice(totalSpent)}</p>
              <p className="text-muted-foreground text-xs">Tong chi tieu</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lich su diem</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Chua co giao dich nao
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn, index) => (
                <div key={txn.id}>
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={getTransactionBadgeVariant(txn.type)}>
                        {getLoyaltyTransactionTypeLabel(txn.type)}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(txn.created_at)}
                      </span>
                    </div>
                    <span
                      className={
                        txn.points > 0
                          ? "font-semibold text-green-600 dark:text-green-400"
                          : "font-semibold text-red-600 dark:text-red-400"
                      }
                    >
                      {formatPoints(txn.points)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
