"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";

export async function getStationTickets(stationId: number) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("kds_tickets")
    .select("*, orders(order_number, table_id, tables(number))")
    .eq("station_id", stationId)
    .in("status", ["pending", "preparing"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStationInfo(stationId: number) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("kds_stations")
    .select("id, name, branch_id, is_active")
    .eq("id", stationId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTimingRules(stationId: number) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("kds_timing_rules")
    .select("category_id, prep_time_min, warning_min, critical_min")
    .eq("station_id", stationId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function bumpTicket(
  ticketId: number,
  newStatus: "preparing" | "ready"
) {
  const supabase = await createSupabaseServer();

  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "preparing") {
    updateData.accepted_at = new Date().toISOString();
  }
  if (newStatus === "ready") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("kds_tickets")
    .update(updateData)
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidatePath("/kds");
  return { error: null };
}
