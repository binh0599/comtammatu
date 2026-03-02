import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMomoSignature, type MomoIPNPayload } from "@/lib/momo";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Max age for webhook timestamps (1 hour in ms)
const MAX_WEBHOOK_AGE_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: MomoIPNPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { resultCode: 1, message: "Invalid request" },
      { status: 400 },
    );
  }

  // Verify HMAC signature
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!secretKey) {
    console.error("MOMO_SECRET_KEY is not configured");
    return NextResponse.json(
      { resultCode: 1, message: "Server error" },
      { status: 500 },
    );
  }

  const { signature, ...signatureParams } = body;

  // Build params object for verification (exclude signature itself)
  const verifyParams: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(signatureParams)) {
    if (value !== undefined && value !== null) {
      verifyParams[key] = value;
    }
  }

  const isValid = verifyMomoSignature(verifyParams, signature, secretKey);
  const supabase = getServiceClient();

  if (!isValid) {
    console.error("Momo IPN signature verification failed", {
      orderId: body.orderId,
      requestId: body.requestId,
    });

    // Log failed HMAC to security_events
    await supabase
      .from("security_events")
      .insert({
        tenant_id: null,
        event_type: "webhook_hmac_failure",
        severity: "warning",
        description: `Momo IPN HMAC verification failed for requestId: ${body.requestId}`,
        source_ip: request.headers.get("x-forwarded-for") ?? null,
      })
      .then(() => {});

    return NextResponse.json(
      { resultCode: 1, message: "Invalid request" },
      { status: 400 },
    );
  }

  // Validate webhook timestamp — reject if older than 1 hour
  if (body.responseTime) {
    const webhookAge = Date.now() - body.responseTime;
    if (webhookAge > MAX_WEBHOOK_AGE_MS) {
      console.error("Momo IPN stale webhook rejected", {
        orderId: body.orderId,
        responseTime: body.responseTime,
        ageMs: webhookAge,
      });

      await supabase
        .from("security_events")
        .insert({
          tenant_id: null,
          event_type: "webhook_stale_request",
          severity: "warning",
          description: `Momo IPN stale webhook rejected (age: ${Math.round(webhookAge / 1000)}s) for requestId: ${body.requestId}`,
          source_ip: request.headers.get("x-forwarded-for") ?? null,
        })
        .then(() => {});

      return NextResponse.json(
        { resultCode: 1, message: "Invalid request" },
        { status: 400 },
      );
    }
  }

  // resultCode 0 = success — use atomic RPC
  if (body.resultCode === 0) {
    const { data: result, error: rpcError } = await supabase.rpc(
      "handle_momo_payment_success",
      {
        p_request_id: body.requestId,
        p_trans_id: String(body.transId),
      },
    );

    if (rpcError) {
      console.error("Momo payment RPC failed", rpcError);
      return NextResponse.json(
        { resultCode: 1, message: "Processing error" },
        { status: 500 },
      );
    }

    const rpcResult = result as {
      status?: string;
      error?: string;
      payment_id?: number;
      order_id?: number;
    };

    if (rpcResult.error === "payment_not_found") {
      return NextResponse.json(
        { resultCode: 1, message: "Not found" },
        { status: 404 },
      );
    }

    // Audit log for successful payment (fire-and-forget)
    if (rpcResult.status === "success" && rpcResult.payment_id) {
      supabase
        .from("audit_logs")
        .insert({
          tenant_id: null,
          user_id: null,
          action: "momo_payment_completed",
          resource_type: "payment",
          resource_id: String(rpcResult.payment_id),
          changes: JSON.stringify({
            requestId: body.requestId,
            transId: body.transId,
            amount: body.amount,
            order_id: rpcResult.order_id,
          }),
          ip_address: request.headers.get("x-forwarded-for") ?? null,
        })
        .then(() => {});
    }

    return NextResponse.json({ resultCode: 0, message: "ok" });
  }

  // resultCode !== 0: payment failed
  const { data: failedPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("idempotency_key", body.requestId)
    .maybeSingle();

  if (failedPayment) {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", failedPayment.id);
  }

  return NextResponse.json({ resultCode: 0, message: "ok" });
}
