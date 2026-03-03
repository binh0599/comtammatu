"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  VALID_KDS_TRANSITIONS,
  KDS_ROLES,
  type KdsTicketStatus,
  ActionError,
  handleServerActionError,
  getKdsBranchContext,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";

// --- Data fetching (consumed by RSC — throw on error) ---

async function _getStationTickets(stationId: number) {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data: tickets, error: ticketsError } = await supabase
    .from("kds_tickets")
    .select("id, order_id, station_id, items, status, priority, created_at, color_code, accepted_at, completed_at")
    .eq("station_id", stationId)
    .in("status", ["pending", "preparing"])
    .order("created_at", { ascending: true });

  if (ticketsError) throw safeDbError(ticketsError, "db");
  if (!tickets || tickets.length === 0) return [];

  const orderIds = [...new Set(tickets.map(t => t.order_id))];

  if (orderIds.length > 0) {
    const { batchFetch } = await import("@comtammatu/database");
    const ordersMap = await batchFetch<any>(
      supabase as any,
      "orders",
      orderIds,
      "id, order_number, table_id, tables(number)"
    );

    for (const ticket of tickets) {
      const order = ordersMap.get(ticket.order_id);
      if (order) {
        (ticket as any).orders = order;
      }
    }
  }

  return tickets as any[];
}

export async function getStationTickets(stationId: number) {
  try {
    return await _getStationTickets(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

async function _getStationInfo(stationId: number) {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase
    .from("kds_stations")
    .select("id, name, branch_id, is_active")
    .eq("id", stationId)
    .eq("branch_id", profile.branch_id)
    .single();

  if (error)
    throw new ActionError("Trạm KDS không tồn tại", "NOT_FOUND", 404);
  return data;
}

export async function getStationInfo(stationId: number) {
  try {
    return await _getStationInfo(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

async function _getTimingRules(stationId: number) {
  const { supabase } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase
    .from("kds_timing_rules")
    .select("category_id, prep_time_min, warning_min, critical_min")
    .eq("station_id", stationId);

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export async function getTimingRules(stationId: number) {
  try {
    return await _getTimingRules(stationId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// --- Mutation (returns ActionResult) ---

async function _bumpTicket(
  ticketId: number,
  newStatus: "preparing" | "ready",
) {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  // Fetch current ticket — verify it belongs to a station in user's branch
  const { data: ticket, error: fetchError } = await supabase
    .from("kds_tickets")
    .select("id, status, station_id, kds_stations(branch_id)")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return { error: "Ticket không tồn tại" };
  }

  // Verify branch ownership via station
  const stationBranchId = (ticket as Record<string, unknown>).kds_stations as
    | { branch_id: number }
    | null;
  if (stationBranchId?.branch_id !== profile.branch_id) {
    return { error: "Ticket không thuộc chi nhánh của bạn" };
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

  if (error) return safeDbErrorResult(error, "db");

  // When ticket becomes ready, broadcast to POS clients
  if (newStatus === "ready") {
    // Fetch order info for broadcast message
    const { data: ticketOrder } = await supabase
      .from("kds_tickets")
      .select("order_id, orders(order_number, branch_id)")
      .eq("id", ticketId)
      .single();

    if (ticketOrder?.orders) {
      const orderInfo = ticketOrder.orders as { order_number: string; branch_id: number };
      const channel = supabase.channel(`branch:${orderInfo.branch_id}:notifications`);
      await channel.send({
        type: "broadcast",
        event: "notification",
        payload: {
          type: "order_ready",
          message: "Bếp đã hoàn thành!",
          order_number: orderInfo.order_number,
        },
      });
      supabase.removeChannel(channel);
    }
  }

  revalidatePath("/kds");
  revalidatePath("/pos/cashier");
  revalidatePath("/pos/orders");
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
