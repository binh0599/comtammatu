import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMomoSignature, type MomoIPNPayload } from "@/lib/momo";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  let body: MomoIPNPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { resultCode: 1, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Verify HMAC signature
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!secretKey) {
    console.error("MOMO_SECRET_KEY is not configured");
    return NextResponse.json(
      { resultCode: 1, message: "Server configuration error" },
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

  if (!isValid) {
    console.error("Momo IPN signature verification failed", {
      orderId: body.orderId,
      requestId: body.requestId,
    });
    return NextResponse.json(
      { resultCode: 1, message: "Invalid signature" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  // resultCode 0 = success
  if (body.resultCode === 0) {
    // Extract our internal order ID from extraData
    let internalOrderId: number | null = null;
    try {
      const extraData = JSON.parse(body.extraData);
      // extraData.orderId format: "ORDER-{id}-{uuid_prefix}"
      const match = extraData.orderId?.match(/^ORDER-(\d+)-/);
      if (match) {
        internalOrderId = Number(match[1]);
      }
    } catch {
      console.error("Failed to parse Momo extraData", body.extraData);
    }

    if (!internalOrderId) {
      console.error("Could not extract order ID from Momo IPN", {
        extraData: body.extraData,
        orderId: body.orderId,
      });
      return NextResponse.json(
        { resultCode: 1, message: "Invalid extraData" },
        { status: 400 },
      );
    }

    // Find pending payment by idempotency_key (= requestId)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, order_id")
      .eq("idempotency_key", body.requestId)
      .maybeSingle();

    if (paymentError) {
      console.error("Payment lookup failed", paymentError);
      return NextResponse.json(
        { resultCode: 1, message: "Payment lookup error" },
        { status: 500 },
      );
    }

    if (!payment) {
      console.error("No payment found for requestId", body.requestId);
      return NextResponse.json(
        { resultCode: 1, message: "Payment not found" },
        { status: 404 },
      );
    }

    // Idempotent: already completed
    if (payment.status === "completed") {
      return NextResponse.json({ resultCode: 0, message: "ok" });
    }

    // Update payment to completed
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        reference_no: String(body.transId),
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Failed to update payment", updatePaymentError);
      return NextResponse.json(
        { resultCode: 1, message: "Payment update error" },
        { status: 500 },
      );
    }

    // Update order to completed
    const { data: order } = await supabase
      .from("orders")
      .select("id, table_id, type")
      .eq("id", payment.order_id)
      .single();

    if (order) {
      await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      // Free table if dine_in
      if (order.table_id && order.type === "dine_in") {
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", order.table_id);
      }

      // Increment voucher usage if applicable
      const { data: voucherDiscount } = await supabase
        .from("order_discounts")
        .select("voucher_id")
        .eq("order_id", order.id)
        .eq("type", "voucher")
        .maybeSingle();

      if (voucherDiscount?.voucher_id) {
        await supabase.rpc("increment_voucher_usage", {
          p_voucher_id: voucherDiscount.voucher_id,
        });
      }
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
