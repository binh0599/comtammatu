"use client";

import { cn } from "@/lib/utils";
import { getTableStatusLabel } from "@comtammatu/shared";

interface TableItem {
  id: number;
  number: number;
  capacity: number | null;
  status: string;
  zone_id: number;
  branch_zones: { name: string } | null;
}

const statusColors: Record<string, string> = {
  available: "border-green-500 bg-green-50 text-green-700 hover:bg-green-100",
  occupied: "border-red-500 bg-red-50 text-red-700",
  reserved: "border-yellow-500 bg-yellow-50 text-yellow-700",
  cleaning: "border-gray-400 bg-gray-50 text-gray-600",
};

export function TableGrid({
  tables,
  selectedId,
  onSelect,
  selectable = true,
}: {
  tables: TableItem[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  selectable?: boolean;
}) {
  // Group by zone
  const zoneMap = new Map<string, TableItem[]>();
  for (const table of tables) {
    const zoneName = table.branch_zones?.name ?? "Khu vực chung";
    const existing = zoneMap.get(zoneName) ?? [];
    existing.push(table);
    zoneMap.set(zoneName, existing);
  }

  return (
    <div className="space-y-6">
      {Array.from(zoneMap.entries()).map(([zoneName, zoneTables]) => (
        <div key={zoneName}>
          <h3 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
            {zoneName}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {zoneTables.map((table) => {
              const isSelectable =
                selectable && table.status === "available";
              const isSelected = selectedId === table.id;

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => {
                    if (isSelectable && onSelect) onSelect(table.id);
                  }}
                  disabled={!isSelectable}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-center rounded-lg border-2 p-3 text-center transition-all",
                    statusColors[table.status] ??
                      "border-gray-300 bg-gray-50",
                    isSelected && "ring-primary ring-2 ring-offset-2",
                    isSelectable && "cursor-pointer active:scale-95",
                    !isSelectable && "cursor-default opacity-70"
                  )}
                >
                  <span className="text-lg font-bold">
                    Bàn {table.number}
                  </span>
                  <span className="text-xs">
                    {getTableStatusLabel(table.status)}
                  </span>
                  {table.capacity && (
                    <span className="mt-0.5 text-xs opacity-60">
                      {table.capacity} chỗ
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          Chưa có bàn nào
        </div>
      )}
    </div>
  );
}
