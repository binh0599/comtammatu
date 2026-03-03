"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  getBranchIdsForTenant,
  withServerAction,
  withServerQuery,
  respondFeedbackSchema,
  entityIdSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getFeedback() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("customer_feedback")
    .select("*, customers(full_name, tenant_id), orders(order_number), branches(name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getFeedback = withServerQuery(_getFeedback);

async function _respondToFeedback(id: number, input: { response: string }) {
  entityIdSchema.parse(id);
  const parsed = respondFeedbackSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  // Scope feedback update to branches owned by this tenant
  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return { error: "Không tìm thấy chi nhánh" };

  const { error } = await supabase
    .from("customer_feedback")
    .update({
      response: parsed.data.response,
      responded_by: userId,
    })
    .eq("id", id)
    .in("branch_id", branchIds);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const respondToFeedback = withServerAction(_respondToFeedback);
