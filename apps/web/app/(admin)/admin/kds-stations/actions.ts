"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  verifyEntityOwnership,
  entityIdSchema,
  safeDbErrorResult,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";
import { z } from "zod";

const validateId = (id: number) => entityIdSchema.parse(id);

const stationSchema = z.object({
  name: z.string().min(1, "Tên bếp không được để trống"),
  branch_id: z.coerce.number().positive(),
  category_ids: z.string().min(1, "Phải chọn ít nhất 1 danh mục"),
});

// =====================
// Queries
// =====================

async function _getKdsStations() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

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

export const getKdsStations = withServerQuery(_getKdsStations);

async function _getBranchesAndCategories() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const [branchesResult, categoriesResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase
      .from("menu_categories")
      .select("id, name, menu_id, menus!inner(tenant_id)")
      .eq("menus.tenant_id", tenantId)
      .order("sort_order"),
  ]);

  if (branchesResult.error) throw new Error(branchesResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);

  return {
    branches: branchesResult.data ?? [],
    categories: (categoriesResult.data ?? []).map(({ id, name, menu_id }: { id: number; name: string; menu_id: number }) => ({
      id,
      name,
      menu_id,
    })),
  };
}

export const getBranchesAndCategories = withServerQuery(_getBranchesAndCategories);

// =====================
// Mutations
// =====================

async function _createKdsStation(formData: FormData) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const parsed = stationSchema.safeParse({
    name: formData.get("name"),
    branch_id: formData.get("branch_id"),
    category_ids: formData.get("category_ids"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { name, branch_id, category_ids } = parsed.data;

  // Verify branch belongs to caller's tenant
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!branch) {
    return { error: "Chi nhánh không hợp lệ hoặc không thuộc đơn vị của bạn" };
  }

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
    // Validate all category IDs belong to this tenant
    const { data: validCats } = await supabase
      .from("menu_categories")
      .select("id, menus!inner(tenant_id)")
      .in("id", categoryIdArray)
      .eq("menus.tenant_id", tenantId);

    if (!validCats || validCats.length !== categoryIdArray.length) {
      await supabase.from("kds_stations").delete().eq("id", station.id);
      return { error: "Một số danh mục không hợp lệ hoặc không thuộc đơn vị của bạn" };
    }

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
  return { error: null, success: true };
}

export const createKdsStation = withServerAction(_createKdsStation);

async function _updateKdsStation(id: number, formData: FormData) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "kds_stations", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const parsed = stationSchema.safeParse({
    name: formData.get("name"),
    branch_id: formData.get("branch_id"),
    category_ids: formData.get("category_ids"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
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
    // Validate all category IDs belong to this tenant
    const { data: validCats } = await supabase
      .from("menu_categories")
      .select("id, menus!inner(tenant_id)")
      .in("id", categoryIdArray)
      .eq("menus.tenant_id", tenantId);

    if (!validCats || validCats.length !== categoryIdArray.length) {
      return { error: "Một số danh mục không hợp lệ hoặc không thuộc đơn vị của bạn" };
    }

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
  return { error: null, success: true };
}

export const updateKdsStation = withServerAction(_updateKdsStation);

async function _toggleKdsStation(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership<{ id: number; is_active: boolean }>(
    supabase, "kds_stations", id, tenantId
  );
  if (ownership.error) return { error: ownership.error };

  const { error: updateError } = await supabase
    .from("kds_stations")
    .update({ is_active: !ownership.data!.is_active })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/kds-stations");
  return { error: null, success: true };
}

export const toggleKdsStation = withServerAction(_toggleKdsStation);

async function _deleteKdsStation(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "kds_stations", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const { error } = await supabase.from("kds_stations").delete().eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/kds-stations");
  return { error: null, success: true };
}

export const deleteKdsStation = withServerAction(_deleteKdsStation);
