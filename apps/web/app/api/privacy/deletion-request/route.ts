import { NextResponse } from "next/server";
import { deletionRequestSchema } from "@comtammatu/shared";
import { getAuthenticatedCustomer } from "../helpers";

/**
 * GET /api/privacy/deletion-request
 * Check status of latest deletion request for the authenticated customer.
 */
export async function GET() {
  const result = await getAuthenticatedCustomer();

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { supabase, customer } = result;

  const { data: request } = await supabase
    .from("deletion_requests")
    .select("id, status, reason, scheduled_deletion_at, created_at, completed_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ deletion_request: request ?? null });
}

/**
 * POST /api/privacy/deletion-request
 * Create a new deletion request with 30-day grace period.
 */
export async function POST(request: Request) {
  const result = await getAuthenticatedCustomer();

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { supabase, customer } = result;

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("deletion_requests")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "A pending deletion request already exists" },
      { status: 409 }
    );
  }

  // Parse optional reason
  let reason: string | undefined;
  try {
    const body = await request.json();
    const parsed = deletionRequestSchema.safeParse(body);
    if (parsed.success) {
      reason = parsed.data.reason || undefined;
    }
  } catch {
    // No body or invalid JSON — reason is optional, so continue
  }

  // Schedule deletion 30 days from now
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 30);

  const { data: newRequest, error } = await supabase
    .from("deletion_requests")
    .insert({
      customer_id: customer.id,
      tenant_id: customer.tenant_id,
      status: "pending",
      reason: reason ?? null,
      scheduled_deletion_at: scheduledAt.toISOString(),
    })
    .select("id, status, scheduled_deletion_at, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ deletion_request: newRequest }, { status: 201 });
}
