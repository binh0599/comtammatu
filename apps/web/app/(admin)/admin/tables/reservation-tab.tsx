"use client";

import { useTransition } from "react";
import { Users, CheckCircle, XCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateTableStatus } from "./actions";
import { toast } from "sonner";

interface TableData {
  id: number;
  branch_id: number;
  number: number;
  capacity: number | null;
  status: string;
  branches: { tenant_id: number; name: string };
  branch_zones: { name: string } | null;
}

export function ReservationTab({ tables }: { tables: TableData[] }) {
  const [isPending, startTransition] = useTransition();
  const reserved = tables.filter((t) => t.status === "reserved");

  function handleStatus(id: number, status: string, label: string) {
    startTransition(async () => {
      const result = await updateTableStatus(id, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(label);
      }
    });
  }

  if (reserved.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">Không có bàn nào đang được đặt</p>
        <p className="mt-1 text-sm">
          Đặt bàn bằng cách đổi trạng thái sang &quot;Đã đặt&quot; trong tab Sơ đồ hoặc Danh sách
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reserved.length} bàn đang được đặt trước
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reserved.map((table) => (
          <Card key={table.id} className="border-2 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Bàn {table.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {(table.branches as { name: string }).name}
                    {table.branch_zones?.name ? ` — ${table.branch_zones.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  <span>{table.capacity ?? "?"}</span>
                </div>
              </div>

              <Badge variant="secondary" className="mt-2">
                Đã đặt
              </Badge>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1"
                  disabled={isPending}
                  onClick={() => handleStatus(table.id, "occupied", "Khách đã ngồi")}
                >
                  <CheckCircle className="size-3.5" />
                  Đã ngồi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={isPending}
                  onClick={() => handleStatus(table.id, "available", "Đã hủy đặt bàn")}
                >
                  <XCircle className="size-3.5" />
                  Hủy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-destructive"
                  disabled={isPending}
                  onClick={() => handleStatus(table.id, "available", "Khách không đến")}
                >
                  <Ban className="size-3.5" />
                  Không đến
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
