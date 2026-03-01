"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const terminalSchema = z.object({
  name: z.string().min(1, "Tên thiết bị không được để trống"),
  type: z.enum(["mobile_order", "cashier_station"]),
  branch_id: z.coerce.number().positive(),
  device_fingerprint: z.string().min(1, "Mã thiết bị không được để trống"),
});

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId, userId: user.id };
}

export async function getTerminals() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("pos_terminals")
    .select("*, branches!inner(tenant_id, name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranches() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTerminal(formData: FormData) {
  const { supabase, userId } = await getTenantId();

  const parsed = terminalSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    branch_id: formData.get("branch_id"),
    device_fingerprint: formData.get("device_fingerprint"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { error } = await supabase.from("pos_terminals").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    branch_id: parsed.data.branch_id,
    device_fingerprint: parsed.data.device_fingerprint,
    registered_by: userId,
    is_active: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Mã thiết bị đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/terminals");
  return { error: null };
}

export async function approveTerminal(id: number) {
  const { supabase, userId } = await getTenantId();

  const { error } = await supabase
    .from("pos_terminals")
    .update({
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/terminals");
  return { error: null };
}

export async function toggleTerminal(id: number) {
  const { supabase } = await getTenantId();

  const { data: terminal, error: fetchError } = await supabase
    .from("pos_terminals")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("pos_terminals")
    .update({ is_active: !terminal.is_active })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/terminals");
  return { error: null };
}

export async function deleteTerminal(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase
    .from("pos_terminals")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/terminals");
  return { error: null };
}
