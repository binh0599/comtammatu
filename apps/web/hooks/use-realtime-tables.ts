"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface TableRow {
  id: number;
  number: number;
  status: string;
  branch_id: number;
}

export function useRealtimeTables<T extends TableRow>(
  branchId: number,
  initialTables: T[]
) {
  const [tables, setTables] = useState<T[]>(initialTables);

  const handleTableChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const eventType = payload.eventType;

      if (eventType === "UPDATE") {
        const updated = payload.new as unknown as T;
        setTables((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
      }
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tables-branch-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
          filter: `branch_id=eq.${branchId}`,
        },
        handleTableChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, handleTableChange]);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  return tables;
}
