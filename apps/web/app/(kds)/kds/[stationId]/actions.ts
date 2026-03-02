"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  VALID_KDS_TRANSITIONS,
  KDS_ROLES,
  type KdsTicketStatus,
  ActionError,
  handleServerActionError,
} from "@comtammatu/shared";

async function getKdsProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ActionError("Ban phai dang nhap", "UNAUTHORIZED", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, branch_id, role")
    .eq("id", user.id)
    .single();

  if (!profile)
    throw new ActionError("Ho so khong tim thay", "NOT_FOUND", 404);
  if (!profile.branch_id)
    throw new ActionError("Chua duoc gan chi nhanh", "UNAUTHORIZED", 403);

  const role = profile.role as (typeof KDS_ROLES)[number];
  if (!KDS_ROLES.includes(role)) {
    throw new ActionError(
      "Ban khong co quyen truy cap KDS",
      "UNAUTHORIZED",
      403,
    );
  }

  return { supabase, userId: user.id, profile };
}

// --- Data fetching (consumed by RSC — throw on error) ---

async function _getStationTickets(stationId: number) {
  const { supabase, profile } = await getKdsProfile();

  const { data, error } = await supabase
    .from("kds_tickets")
    .select("*, orders(order_number, table_id, tables(number))")
    .eq("station_id", stationId)
    .in("status", ["pending", "preparing"])
    .order("created_at", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export async function getStationTickets(stationId: number) {
  try {
    return await _getStationTickets(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

async function _getStationInfo(stationId: number) {
  const { supabase, profile } = await getKdsProfile();

  const { data, error } = await supabase
    .from("kds_stations")
    .select("id, name, branch_id, is_active")
    .eq("id", stationId)
    .eq("branch_id", profile.branch_id!)
    .single();

  if (error)
    throw new ActionError("Tram KDS khong ton tai", "NOT_FOUND", 404);
  return data;
}

export async function getStationInfo(stationId: number) {
  try {
    return await _getStationInfo(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

async function _getTimingRules(stationId: number) {
  const { supabase } = await getKdsProfile();

  const { data, error } = await supabase
    .from("kds_timing_rules")
    .select("category_id, prep_time_min, warning_min, critical_min")
    .eq("station_id", stationId);

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export async function getTimingRules(stationId: number) {
  try {
    return await _getTimingRules(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

// --- Mutation (returns ActionResult) ---

async function _bumpTicket(
  ticketId: number,
  newStatus: "preparing" | "ready",
) {
  const { supabase, profile } = await getKdsProfile();

  // Fetch current ticket — verify it belongs to a station in user's branch
  const { data: ticket, error: fetchError } = await supabase
    .from("kds_tickets")
    .select("id, status, station_id, kds_stations(branch_id)")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return { error: "Ticket khong ton tai" };
  }

  // Verify branch ownership via station
  const stationBranchId = (ticket as Record<string, unknown>).kds_stations as
    | { branch_id: number }
    | null;
  if (stationBranchId?.branch_id !== profile.branch_id) {
    return { error: "Ticket khong thuoc chi nhanh cua ban" };
  }

  // Validate state machine transition
  const currentStatus = ticket.status as KdsTicketStatus;
  const allowed = VALID_KDS_TRANSITIONS[currentStatus];
  if (!allowed?.includes(newStatus as KdsTicketStatus)) {
    return {
      error: `Khong the chuyen tu "${currentStatus}" sang "${newStatus}"`,
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

export async function bumpTicket(
  ticketId: number,
  newStatus: "preparing" | "ready",
) {
  try {
    return await _bumpTicket(ticketId, newStatus);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}
