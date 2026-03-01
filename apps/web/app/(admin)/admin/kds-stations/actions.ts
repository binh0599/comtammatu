"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const stationSchema = z.object({
  name: z.string().min(1, "Tên bếp không được để trống"),
  branch_id: z.coerce.number().positive(),
  category_ids: z.string().min(1, "Phải chọn ít nhất 1 danh mục"),
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
  return { supabase, tenantId };
}

export async function getKdsStations() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("kds_stations")
    .select(
      "*, branches!inner(tenant_id, name), kds_station_categories(category_id, menu_categories(id, name))"
    )
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranchesAndCategories() {
  const { supabase, tenantId } = await getTenantId();

  const [branchesResult, categoriesResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase.from("menu_categories").select("id, name, menu_id").order("sort_order"),
  ]);

  if (branchesResult.error) throw new Error(branchesResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);

  return {
    branches: branchesResult.data ?? [],
    categories: categoriesResult.data ?? [],
  };
}

export async function createKdsStation(formData: FormData) {
  const { supabase } = await getTenantId();

  const parsed = stationSchema.safeParse({
    name: formData.get("name"),
    branch_id: formData.get("branch_id"),
    category_ids: formData.get("category_ids"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { name, branch_id, category_ids } = parsed.data;

  const { data: station, error: stationError } = await supabase
    .from("kds_stations")
    .insert({ name, branch_id, is_active: true })
    .select("id")
    .single();

  if (stationError) return { error: stationError.message };

  const categoryIdArray = category_ids
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !isNaN(id) && id > 0);

  if (categoryIdArray.length > 0) {
    const junctionRows = categoryIdArray.map((category_id) => ({
      station_id: station.id,
      category_id,
    }));

    const { error: junctionError } = await supabase
      .from("kds_station_categories")
      .insert(junctionRows);

    if (junctionError) return { error: junctionError.message };
  }

  revalidatePath("/admin/kds-stations");
  return { success: true };
}

export async function updateKdsStation(id: number, formData: FormData) {
  const { supabase } = await getTenantId();

  const parsed = stationSchema.safeParse({
    name: formData.get("name"),
    branch_id: formData.get("branch_id"),
    category_ids: formData.get("category_ids"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { name, category_ids } = parsed.data;

  const { error: updateError } = await supabase
    .from("kds_stations")
    .update({ name })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  const { error: deleteError } = await supabase
    .from("kds_station_categories")
    .delete()
    .eq("station_id", id);

  if (deleteError) return { error: deleteError.message };

  const categoryIdArray = category_ids
    .split(",")
    .map((cid) => Number(cid.trim()))
    .filter((cid) => !isNaN(cid) && cid > 0);

  if (categoryIdArray.length > 0) {
    const junctionRows = categoryIdArray.map((category_id) => ({
      station_id: id,
      category_id,
    }));

    const { error: junctionError } = await supabase
      .from("kds_station_categories")
      .insert(junctionRows);

    if (junctionError) return { error: junctionError.message };
  }

  revalidatePath("/admin/kds-stations");
  return { success: true };
}

export async function toggleKdsStation(id: number) {
  const { supabase } = await getTenantId();

  const { data: station, error: fetchError } = await supabase
    .from("kds_stations")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error: updateError } = await supabase
    .from("kds_stations")
    .update({ is_active: !station.is_active })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/kds-stations");
  return { success: true };
}

export async function deleteKdsStation(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("kds_stations").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/kds-stations");
  return { success: true };
}
