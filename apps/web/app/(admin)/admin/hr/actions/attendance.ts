"use server";

import "@/lib/server-bootstrap";
import { getActionContext, withServerQuery, safeDbError } from "@comtammatu/shared";

import { getBranchesInternal } from "./employees";

// =====================
// Attendance
// =====================

async function _getAttendanceRecords(date: string) {
  const { supabase, tenantId } = await getActionContext();

  const branchList = await getBranchesInternal(supabase, tenantId);
  const branchIds = branchList.map((b: { id: number }) => b.id);

  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, employees!inner(profile_id, profiles(full_name)), branches!inner(name)")
    .in("branch_id", branchIds)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getAttendanceRecords = withServerQuery(_getAttendanceRecords);
