"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  VALID_KDS_TRANSITIONS,
  KDS_ROLES,
  type KdsTicketStatus,
} from "@comtammatu/shared";

async function getKdsProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, branch_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (!profile.branch_id) throw new Error("No branch assigned");

  const role = profile.role as (typeof KDS_ROLES)[number];
  if (!KDS_ROLES.includes(role)) {
    throw new Error("Not authorized for KDS operations");
  }

  return { supabase, userId: user.id, profile };
}

export async function getStationTickets(stationId: number) {
  const { supabase } = await getKdsProfile();

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
  const { supabase } = await getKdsProfile();

  const { data, error } = await supabase
    .from("kds_stations")
    .select("id, name, branch_id, is_active")
    .eq("id", stationId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTimingRules(stationId: number) {
  const { supabase } = await getKdsProfile();

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
  const { supabase } = await getKdsProfile();

  // Fetch current ticket to validate state transition
  const { data: ticket, error: fetchError } = await supabase
    .from("kds_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return { error: "Ticket không tồn tại" };
  }

  // Validate state machine transition
  const currentStatus = ticket.status as KdsTicketStatus;
  const allowed = VALID_KDS_TRANSITIONS[currentStatus];
  if (!allowed?.includes(newStatus as KdsTicketStatus)) {
    return {
      error: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"`,
    };
  }

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
