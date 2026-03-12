"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getAdminContext,
  HR_ROLES,
  withServerAction,
  withServerQuery,
  createPayrollPeriodSchema,
  payrollPeriodIdSchema,
  updatePayrollEntrySchema,
  type CreatePayrollPeriodInput,
  type UpdatePayrollEntryInput,
  VALID_PAYROLL_TRANSITIONS,
  type PayrollStatus,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// =====================
// Payroll
// =====================

async function _getPayrollPeriods(branchId?: number) {
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  let query = supabase
    .from("payroll_periods")
    .select("*, branches!inner(name), approved_by")
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false })
    .limit(50);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPayrollPeriods = withServerQuery(_getPayrollPeriods);

async function _getPayrollEntries(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    throw new ActionError("ID kỳ lương không hợp lệ", "VALIDATION_ERROR", 400);
  }
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify the period belongs to the tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    throw safeDbError(periodError ?? new Error("Kỳ lương không tồn tại"), "db");
  }

  const { data, error } = await supabase
    .from("payroll_entries")
    .select(
      "*, employees!inner(profile_id, branch_id, profiles(full_name))"
    )
    .eq("payroll_period_id", periodId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPayrollEntries = withServerQuery(_getPayrollEntries);

async function _createPayrollPeriod(data: CreatePayrollPeriodInput) {
  const parsed = createPayrollPeriodSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify branch belongs to tenant
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (branchError || !branch) {
    return { error: "Chi nhánh không hợp lệ" };
  }

  const { error } = await supabase.from("payroll_periods").insert({
    tenant_id: tenantId,
    branch_id: parsed.data.branch_id,
    name: parsed.data.name,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    notes: parsed.data.notes || null,
    status: "draft",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Kỳ lương này đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const createPayrollPeriod = withServerAction(_createPayrollPeriod);

async function _calculatePayroll(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify period exists, belongs to tenant, and is in draft or calculated status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, branch_id, start_date, end_date, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "draft" && period.status !== "calculated") {
    return { error: "Chỉ có thể tính lương cho kỳ ở trạng thái nháp hoặc đã tính" };
  }

  // Fetch all active employees for this branch
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, hourly_rate, monthly_salary")
    .eq("tenant_id", tenantId)
    .eq("branch_id", period.branch_id)
    .eq("status", "active");

  if (empError) return safeDbErrorResult(empError, "db");

  const empList = employees ?? [];
  const empIds = empList.map((e: { id: number }) => e.id);

  // Batch-fetch all attendance records for all employees in one query
  const hoursMap = new Map<number, number>();
  if (empIds.length > 0) {
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("employee_id, hours_worked")
      .in("employee_id", empIds)
      .gte("date", period.start_date)
      .lte("date", period.end_date);

    if (attendanceError) return safeDbErrorResult(attendanceError, "db");

    for (const r of attendance ?? []) {
      const prev = hoursMap.get(r.employee_id) ?? 0;
      hoursMap.set(r.employee_id, prev + (r.hours_worked ?? 0));
    }
  }

  // For each employee, calculate pay
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = [];

  for (const emp of empList) {
    const totalHours = hoursMap.get(emp.id) ?? 0;

    // Calculate base_pay
    let basePay = 0;
    if (emp.hourly_rate) {
      basePay = totalHours * Number(emp.hourly_rate);
    } else if (emp.monthly_salary) {
      basePay = Number(emp.monthly_salary);
    }

    entries.push({
      tenant_id: tenantId,
      payroll_period_id: periodId,
      employee_id: emp.id,
      total_hours: totalHours,
      hourly_rate: emp.hourly_rate ?? null,
      monthly_salary: emp.monthly_salary ?? null,
      base_pay: basePay,
      overtime_hours: 0,
      overtime_pay: 0,
      deductions: 0,
      bonuses: 0,
      net_pay: basePay,
    });
  }

  // Upsert payroll entries
  if (entries.length > 0) {
    const { error: upsertError } = await supabase
      .from("payroll_entries")
      .upsert(entries, { onConflict: "payroll_period_id,employee_id" });

    if (upsertError) return safeDbErrorResult(upsertError, "db");
  }

  // Update period status to calculated
  const { error: updateError } = await supabase
    .from("payroll_periods")
    .update({ status: "calculated" })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (updateError) return safeDbErrorResult(updateError, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const calculatePayroll = withServerAction(_calculatePayroll);

async function _updatePayrollEntry(data: UpdatePayrollEntryInput) {
  const parsed = updatePayrollEntrySchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify the entry belongs to tenant — fetch all fields needed for net_pay recalc
  const { data: entry, error: entryError } = await supabase
    .from("payroll_entries")
    .select("id, payroll_period_id, base_pay, overtime_pay, deductions, bonuses")
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId)
    .single();

  if (entryError || !entry) {
    return { error: "Bản ghi lương không tồn tại" };
  }

  // Verify parent period is in 'calculated' status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("status")
    .eq("id", entry.payroll_period_id)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "calculated") {
    return { error: "Chỉ có thể chỉnh sửa khi kỳ lương ở trạng thái đã tính" };
  }

  // Build update payload — merge with existing values for net_pay recalc
  const basePay = Number(entry.base_pay);
  const overtimePay = parsed.data.overtime_pay ?? Number(entry.overtime_pay);
  const deductions = parsed.data.deductions ?? Number(entry.deductions);
  const bonuses = parsed.data.bonuses ?? Number(entry.bonuses);
  const netPay = basePay + overtimePay + bonuses - deductions;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    net_pay: netPay,
  };
  if (parsed.data.overtime_hours !== undefined) payload.overtime_hours = parsed.data.overtime_hours;
  if (parsed.data.overtime_pay !== undefined) payload.overtime_pay = parsed.data.overtime_pay;
  if (parsed.data.deductions !== undefined) payload.deductions = parsed.data.deductions;
  if (parsed.data.bonuses !== undefined) payload.bonuses = parsed.data.bonuses;
  if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes || null;

  const { error } = await supabase
    .from("payroll_entries")
    .update(payload)
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const updatePayrollEntry = withServerAction(_updatePayrollEntry);

async function _approvePayroll(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId, userId } = await getAdminContext(HR_ROLES);

  // Verify period belongs to tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  const validNext = VALID_PAYROLL_TRANSITIONS[period.status as PayrollStatus];
  if (!validNext?.includes("approved")) {
    return { error: "Không thể duyệt kỳ lương ở trạng thái này" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const approvePayroll = withServerAction(_approvePayroll);

async function _markPayrollPaid(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify period belongs to tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  const validNext = VALID_PAYROLL_TRANSITIONS[period.status as PayrollStatus];
  if (!validNext?.includes("paid")) {
    return { error: "Không thể đánh dấu đã trả lương ở trạng thái này" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({ status: "paid" })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const markPayrollPaid = withServerAction(_markPayrollPaid);

async function _deletePayrollPeriod(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  // Verify period belongs to tenant and is in draft status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "draft") {
    return { error: "Chỉ có thể xóa kỳ lương ở trạng thái nháp" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .delete()
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const deletePayrollPeriod = withServerAction(_deletePayrollPeriod);
