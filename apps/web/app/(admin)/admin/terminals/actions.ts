"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  entityIdSchema,
  safeDbErrorResult,
  updateDeviceCategoriesSchema,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

const validateId = (id: number) => entityIdSchema.parse(id);

// =====================
// Queries
// =====================

async function _getDevices() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("registered_devices")
    .select("*, branches(name), profiles!registered_devices_registered_by_fkey(full_name, role)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getDevices = withServerQuery(_getDevices);

// =====================
// Device Approval
// =====================

async function _approveDevice(id: number) {
  validateId(id);
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify device belongs to caller's tenant
  const { data: device, error: deviceError } = await supabase
    .from("registered_devices")
    .select(
      "id, status, tenant_id, branch_id, device_name, device_type, terminal_type, approval_code, device_fingerprint"
    )
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (deviceError) {
    if (deviceError.code === "PGRST116") {
      return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
    }
    return safeDbErrorResult(deviceError, "db");
  }

  if (!device) {
    return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  if (device.status === "approved") {
    return { error: "Thiết bị đã được duyệt trước đó" };
  }

  let linkedStationId: number | null = null;
  let linkedTerminalId: number | null = null;

  // For KDS devices: auto-create a kds_station and link it
  if (device.device_type === "kds") {
    const stationName = device.device_name || `KDS-${device.approval_code}`;

    const { data: station, error: stationError } = await supabase
      .from("kds_stations")
      .insert({
        branch_id: device.branch_id,
        name: stationName,
        is_active: true,
      })
      .select("id")
      .single();

    if (stationError) return safeDbErrorResult(stationError, "createKdsStation");

    linkedStationId = station.id;

    // Assign ALL menu categories to this station (default)
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, menus!inner(branch_id)")
      .eq("menus.branch_id", device.branch_id);

    if (categories && categories.length > 0) {
      const stationCategories = categories.map((c: { id: number }) => ({
        station_id: station.id,
        category_id: c.id,
      }));

      const { error: catError } = await supabase
        .from("kds_station_categories")
        .insert(stationCategories);

      if (catError) return safeDbErrorResult(catError, "assignKdsCategories");
    }
  }

  // For POS devices: auto-create a pos_terminal and link it
  if (device.device_type === "pos" && device.terminal_type) {
    const terminalName = device.device_name || `POS-${device.approval_code}`;

    const { data: terminal, error: terminalError } = await supabase
      .from("pos_terminals")
      .insert({
        branch_id: device.branch_id,
        name: terminalName,
        type: device.terminal_type,
        device_fingerprint: device.device_fingerprint,
        is_active: true,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (terminalError) return safeDbErrorResult(terminalError, "createPosTerminal");

    linkedTerminalId = terminal.id;
  }

  // Approve the device (scoped by tenant_id for defense-in-depth)
  const { error } = await supabase
    .from("registered_devices")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      ...(linkedStationId != null ? { linked_station_id: linkedStationId } : {}),
      ...(linkedTerminalId != null ? { linked_terminal_id: linkedTerminalId } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  revalidatePath("/admin/kds-stations");
  return { error: null };
}

export const approveDevice = withServerAction(_approveDevice);

async function _rejectDevice(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data: device, error: deviceError } = await supabase
    .from("registered_devices")
    .select("id, status, tenant_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (deviceError) {
    if (deviceError.code === "PGRST116") {
      return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
    }
    return safeDbErrorResult(deviceError, "db");
  }

  if (!device) {
    return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  if (device.status === "approved") {
    return { error: "Không thể từ chối thiết bị đã được duyệt. Hãy xóa thiết bị thay thế." };
  }

  if (device.status === "rejected") {
    return { error: "Thiết bị đã bị từ chối trước đó" };
  }

  const { error } = await supabase
    .from("registered_devices")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const rejectDevice = withServerAction(_rejectDevice);

async function _deleteDevice(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data: device, error: deviceError } = await supabase
    .from("registered_devices")
    .select("id, tenant_id, linked_station_id, linked_terminal_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (deviceError) {
    if (deviceError.code === "PGRST116") {
      return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
    }
    return safeDbErrorResult(deviceError, "db");
  }

  if (!device) {
    return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  // Soft-delete linked KDS station if exists
  if (device.linked_station_id) {
    await supabase
      .from("kds_stations")
      .update({ is_active: false })
      .eq("id", device.linked_station_id);
  }

  // Soft-delete linked POS terminal if exists
  if (device.linked_terminal_id) {
    await supabase
      .from("pos_terminals")
      .update({ is_active: false })
      .eq("id", device.linked_terminal_id);
  }

  const { error } = await supabase
    .from("registered_devices")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  revalidatePath("/admin/kds-stations");
  return { error: null };
}

export const deleteDevice = withServerAction(_deleteDevice);

// =====================
// KDS Category Management
// =====================

async function _updateDeviceCategories(formData: FormData) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  let categoryIds: unknown;
  try {
    categoryIds = JSON.parse((formData.get("category_ids") as string) || "[]");
  } catch {
    return { error: "Dữ liệu danh mục không hợp lệ" };
  }

  const parsed = updateDeviceCategoriesSchema.safeParse({
    device_id: Number(formData.get("device_id")),
    category_ids: categoryIds,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Verify device belongs to tenant and has a linked station
  const { data: device } = await supabase
    .from("registered_devices")
    .select("id, linked_station_id, tenant_id")
    .eq("id", parsed.data.device_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!device) {
    return { error: "Thiết bị không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  if (!device.linked_station_id) {
    return { error: "Thiết bị này không phải KDS hoặc chưa có trạm bếp liên kết" };
  }

  // Delete existing categories and re-insert
  const { error: deleteError } = await supabase
    .from("kds_station_categories")
    .delete()
    .eq("station_id", device.linked_station_id);

  if (deleteError) return safeDbErrorResult(deleteError, "deleteCategories");

  const stationCategories = parsed.data.category_ids.map((categoryId) => ({
    station_id: device.linked_station_id!,
    category_id: categoryId,
  }));

  const { error } = await supabase.from("kds_station_categories").insert(stationCategories);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const updateDeviceCategories = withServerAction(_updateDeviceCategories);
