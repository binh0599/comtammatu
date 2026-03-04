"use client";

import { useEffect, useState } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs table added via migration, types not yet regenerated
type SupabaseAny = any;

interface PrinterConfig {
  id: number;
  name: string;
  type: "thermal_usb" | "thermal_network" | "browser";
  connection_config: Record<string, unknown>;
  paper_width_mm: number;
  encoding: string;
  auto_print: boolean;
  print_delay_ms: number;
  is_active: boolean;
  test_status: string | null;
}

/**
 * Fetch the printer config assigned to a POS terminal.
 */
export function usePrinterForTerminal(terminalId: number | null) {
  return usePrinterConfig("pos_terminal", terminalId);
}

/**
 * Fetch the printer config assigned to a KDS station.
 */
export function usePrinterForStation(stationId: number | null) {
  return usePrinterConfig("kds_station", stationId);
}

function usePrinterConfig(
  assignedToType: "pos_terminal" | "kds_station",
  assignedToId: number | null,
) {
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignedToId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const supabase: SupabaseAny = createClient();
      const { data, error } = await supabase
        .from("printer_configs")
        .select("*")
        .eq("assigned_to_type", assignedToType)
        .eq("assigned_to_id", assignedToId as number)
        .eq("is_active", true)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          setConfig(data as PrinterConfig);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assignedToType, assignedToId]);

  return { config, loading };
}

export type { PrinterConfig };
