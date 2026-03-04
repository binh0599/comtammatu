"use client";

import Link from "next/link";
import { BookOpen, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function CustomerHome() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Chao mung den Com Tam Ma Tu!</h1>
        <p className="text-muted-foreground text-sm">Chuc ban ngon mieng!</p>
      </div>

      {/* Menu card */}
      <Link href="/customer/menu">
        <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
              <BookOpen className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Thuc don</span>
              <p className="text-muted-foreground text-sm">
                Xem thuc don nha hang
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Mobile app notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-blue-900">
              Ung dung di dong sap ra mat!
            </span>
            <p className="text-sm text-blue-700">
              Dat hang, tich diem, xem lich su don hang va quan ly tai khoan ngay
              tren dien thoai.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
