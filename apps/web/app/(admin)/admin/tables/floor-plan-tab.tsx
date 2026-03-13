"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import {
  TABLE_STATUSES,
  getTableStatusLabel,
} from "@comtammatu/shared";
import { updateTableStatus } from "./actions";
import {
  Badge,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@comtammatu/ui";

interface TableRow {
  id: number;
  branch_id: number;
  number: number;
  capacity: number | null;
  status: string;
  zone_id: number;
  branches: { tenant_id: number; name: string };
  branch_zones: { name: string } | null;
}

interface Branch {
  id: number;
  name: string;
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 border-green-400 text-green-800",
  occupied: "bg-red-100 border-red-400 text-red-800",
  reserved: "bg-yellow-100 border-yellow-400 text-yellow-800",
  maintenance: "bg-gray-100 border-gray-400 text-gray-600",
};

export function FloorPlanTab({
  tables,
  branches,
  summary,
}: {
  tables: TableRow[];
  branches: Branch[];
  summary: Record<string, Record<string, number>>;
}) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredTables =
    branchFilter === "all"
      ? tables
      : tables.filter((t) => t.branch_id === Number(branchFilter));

  // Group by zone
  const grouped: Record<string, TableRow[]> = {};
  for (const t of filteredTables) {
    const zone = t.branch_zones?.name ?? "Chung";
    if (!grouped[zone]) grouped[zone] = [];
    grouped[zone].push(t);
  }

  function handleStatusChange(tableId: number, newStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateTableStatus(tableId, newStatus);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary).map(([branchName, counts]) => (
            <Card key={branchName}>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-muted-foreground">{branchName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="default">{counts["available"] ?? 0} Trống</Badge>
                  <Badge variant="destructive">{counts["occupied"] ?? 0} Có khách</Badge>
                  <Badge variant="secondary">{counts["reserved"] ?? 0} Đã đặt</Badge>
                  <Badge variant="outline">{counts["maintenance"] ?? 0} Bảo trì</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tổng: {counts["total"] ?? 0} bàn
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả chi nhánh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chi nhánh</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Floor Plan Grid grouped by zone */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Chưa có bàn nào. Vui lòng thêm bàn trong tab "Danh sách".
        </p>
      ) : (
        Object.entries(grouped).map(([zone, zoneTables]) => (
          <div key={zone}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {zone}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {zoneTables.map((table) => (
                <Card
                  key={table.id}
                  className={`border-2 transition-colors ${statusColors[table.status] ?? "border-gray-200"} ${isPending ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">Bàn {table.number}</p>
                    <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                      <Users className="size-3" />
                      <span>{table.capacity ?? "?"}</span>
                    </div>
                    <Select
                      value={table.status}
                      onValueChange={(val) => handleStatusChange(table.id, val)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="mt-2 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TABLE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {getTableStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {(table.branches as { name: string }).name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
