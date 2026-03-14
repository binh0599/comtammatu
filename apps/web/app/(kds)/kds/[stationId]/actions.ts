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
  bumpTicketSchema,
  recallTicketSchema,
} from "@comtammatu/shared";

// --- Data fetching (consumed by RSC — throw on error) ---

async function _getStationTickets(stationId: number) {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  // Verify station belongs to user's branch
  const { data: stationCheck } = await supabase
    .from("kds_stations")
    .select("id")
    .eq("id", stationId)
    .eq("branch_id", profile.branch_id)
    .single();

  if (!stationCheck) {
    throw new ActionError("Trạm KDS không thuộc chi nhánh của bạn", "UNAUTHORIZED", 403);
  }

  const { data: tickets, error: ticketsError } = await supabase
    .from("kds_tickets")
    .select("id, order_id, station_id, items, status, priority, created_at, color_code, accepted_at, completed_at")
    .eq("station_id", stationId)
    .in("status", ["pending", "preparing"])
    .order("created_at", { ascending: true });

  if (ticketsError) throw safeDbError(ticketsError, "db");
  if (!tickets || tickets.length === 0) return [];

  const orderIds = [...new Set(tickets.map((t: { order_id: number }) => t.order_id))] as number[];

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
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  // Verify station belongs to user's branch
  const { data: stationCheck } = await supabase
    .from("kds_stations")
    .select("id")
    .eq("id", stationId)
    .eq("branch_id", profile.branch_id)
    .single();

  if (!stationCheck) {
    throw new ActionError("Trạm KDS không thuộc chi nhánh của bạn", "UNAUTHORIZED", 403);
  }

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

  // Verify branch ownership via station (runtime-validated)
  const stationData = ticket.kds_stations;
  if (
    !stationData ||
    typeof stationData !== "object" ||
    !("branch_id" in stationData) ||
    typeof stationData.branch_id !== "number"
  ) {
    return { error: "Không thể xác minh chi nhánh của trạm KDS" };
  }
  if (stationData.branch_id !== profile.branch_id) {
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

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "preparing") {
    updateData.accepted_at = now;
  }
  if (newStatus === "ready") {
    updateData.completed_at = now;
    // When going directly from pending → ready, also set accepted_at
    if (currentStatus === "pending") {
      updateData.accepted_at = now;
    }
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

    if (
      ticketOrder?.orders &&
      typeof ticketOrder.orders === "object" &&
      "order_number" in ticketOrder.orders &&
      "branch_id" in ticketOrder.orders
    ) {
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
  const parsed = bumpTicketSchema.safeParse({ ticket_id: ticketId, status: newStatus });
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  try {
    return await _bumpTicket(parsed.data.ticket_id, parsed.data.status);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// ---------------------------------------------------------------------------
// recallTicket — undo accidental bump to ready (within 30s window)
// ---------------------------------------------------------------------------

const RECALL_WINDOW_SECONDS = 30;

async function _recallTicket(ticketId: number) {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  // Fetch ticket with station + order info
  const { data: ticket, error: fetchError } = await supabase
    .from("kds_tickets")
    .select("id, status, station_id, order_id, completed_at, kds_stations(branch_id)")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return { error: "Ticket không tồn tại" };
  }

  // Verify branch ownership (runtime-validated)
  const stationBranch = ticket.kds_stations;
  if (
    !stationBranch ||
    typeof stationBranch !== "object" ||
    !("branch_id" in stationBranch) ||
    typeof stationBranch.branch_id !== "number"
  ) {
    return { error: "Không thể xác minh chi nhánh của trạm KDS" };
  }
  if (stationBranch.branch_id !== profile.branch_id) {
    return { error: "Ticket không thuộc chi nhánh của bạn" };
  }

  // Only allow recall from "ready" status
  if (ticket.status !== "ready") {
    return { error: "Chỉ có thể hoàn tác ticket đã ra món" };
  }

  // Check time window — only within RECALL_WINDOW_SECONDS of completion
  if (ticket.completed_at) {
    const completedAt = new Date(ticket.completed_at).getTime();
    const elapsed = (Date.now() - completedAt) / 1000;
    if (elapsed > RECALL_WINDOW_SECONDS) {
      return { error: `Đã quá ${RECALL_WINDOW_SECONDS} giây — không thể hoàn tác` };
    }
  }

  // Set ticket back to "preparing"
  const { error: updateError } = await supabase
    .from("kds_tickets")
    .update({ status: "preparing", completed_at: null })
    .eq("id", ticketId)
    .eq("status", "ready"); // Race-condition guard

  if (updateError) return safeDbErrorResult(updateError, "db");

  // Also revert order status back to "preparing" if it was auto-set to "ready"
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", ticket.order_id)
    .single();

  if (order && order.status === "ready") {
    await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", order.id)
      .eq("status", "ready"); // Race-condition guard
  }

  revalidatePath("/kds");
  revalidatePath("/pos/orders");
  return { error: null };
}

export async function recallTicket(ticketId: number) {
  const parsed = recallTicketSchema.safeParse({ ticket_id: ticketId });
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  try {
    return await _recallTicket(parsed.data.ticket_id);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}
