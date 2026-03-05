"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import {
  formatDate,
  formatPrice,
  getPayrollStatusLabel,
} from "@comtammatu/shared";

interface PayrollEntry {
  id: number;
  total_hours: number;
  hourly_rate: number | null;
  monthly_salary: number | null;
  base_pay: number;
  overtime_hours: number;
  overtime_pay: number;
  deductions: number;
  bonuses: number;
  net_pay: number;
  notes: string | null;
  payroll_periods: {
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    branches: { name: string } | null;
  };
}

interface PayrollStubsProps {
  entries: PayrollEntry[];
}

export function PayrollStubs({ entries }: PayrollStubsProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Phiếu lương</h2>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <Wallet className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              Chưa có phiếu lương nào.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Phiếu lương</h2>
      {entries.map((entry) => {
        const period = entry.payroll_periods;
        return (
          <Card key={entry.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{period.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(period.start_date)} -{" "}
                    {formatDate(period.end_date)}
                  </p>
                  {period.branches?.name && (
                    <p className="text-muted-foreground text-xs">
                      {period.branches.name}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    period.status === "paid"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-green-100 text-green-800"
                  }
                >
                  {getPayrollStatusLabel(period.status)}
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giờ làm</span>
                  <span>{entry.total_hours}h</span>
                </div>
                {entry.hourly_rate != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lương/giờ</span>
                    <span>{formatPrice(entry.hourly_rate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lương cơ bản</span>
                  <span>{formatPrice(entry.base_pay)}</span>
                </div>
                {entry.overtime_pay > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tăng ca ({entry.overtime_hours}h)
                    </span>
                    <span className="text-green-600">
                      +{formatPrice(entry.overtime_pay)}
                    </span>
                  </div>
                )}
                {entry.bonuses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thưởng</span>
                    <span className="text-green-600">
                      +{formatPrice(entry.bonuses)}
                    </span>
                  </div>
                )}
                {entry.deductions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Khấu trừ</span>
                    <span className="text-red-600">
                      -{formatPrice(entry.deductions)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Thực nhận</span>
                  <span>{formatPrice(entry.net_pay)}</span>
                </div>
              </div>

              {entry.notes && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {entry.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
