import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";
import { checkIdempotency, saveIdempotencyResponse } from "../_shared/idempotency.ts";

const QrCheckinSchema = z.object({
  qr_payload: z.string().min(1, "QR payload không được để trống."),
  device_fingerprint: z.string().min(1, "Device fingerprint không được để trống."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  method: z.literal("qr_code").optional().default("qr_code"),
  branch_id: z.number().int().positive().optional(),
});

const GeoCheckinSchema = z.object({
  method: z.literal("geolocation"),
  branch_id: z.number().int().positive("ID chi nhánh phải là số nguyên dương."),
  device_fingerprint: z.string().min(1, "Device fingerprint không được để trống."),
  latitude: z.number({ required_error: "Vị trí GPS là bắt buộc cho phương thức geolocation." }),
  longitude: z.number({ required_error: "Vị trí GPS là bắt buộc cho phương thức geolocation." }),
  qr_payload: z.string().optional(),
});

const CheckinSchema = z.union([GeoCheckinSchema, QrCheckinSchema]);

const CHECKIN_POINTS_BASE = 5;
const QR_EXPIRY_SECONDS = 60;
const GEO_MAX_DISTANCE_METERS = 100;
const HMAC_SECRET = Deno.env.get("CHECKIN_HMAC_SECRET") ?? "comtammatu-checkin-secret";

// Streak milestones: { days: bonus_points }
const STREAK_MILESTONES: Record<number, number> = {
  7: 20,
  14: 50,
  30: 100,
};

/**
 * Calculate distance between two lat/lng points in meters (Haversine formula).
 */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verify HMAC signature on QR payload.
 */
async function verifyHmac(data: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(HMAC_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = hexToBytes(signature);
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Decode base64url string to JSON.
 */
function decodeQrPayload(payload: string): {
  branch_id: number;
  timestamp: number;
  nonce: string;
  hmac: string;
} | null {
  try {
    // Convert base64url to base64
    let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  // Auth: customer required
  const [user, authError] = await extractUser(req, ["customer"]);
  if (authError) return authError;

  const adminClient = createAdminClient();

  // Idempotency check
  const [idempotencyKey, idempotencyError] = await checkIdempotency(req, adminClient);
  if (idempotencyError) return idempotencyError;

  // Validate input
  const [body, validationError] = await validateBody(req, CheckinSchema);
  if (validationError) return validationError;

  try {
    // Get customer
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select("id, available_points, total_points, version, tenant_id, streak_days, last_checkin_date")
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return errorResponse("NOT_FOUND", "Không tìm thấy thông tin thành viên.", 404);
    }

    let branchId: number;
    const method = body.method ?? (body.qr_payload ? "qr_code" : "geolocation");

    // ─── QR Code Method ───
    if (method === "qr_code" && body.qr_payload) {
      const qrData = decodeQrPayload(body.qr_payload);
      if (!qrData) {
        return errorResponse("INVALID_QR", "Mã QR không hợp lệ. Vui lòng quét lại.", 400);
      }

      // Verify HMAC
      const dataToVerify = JSON.stringify({
        branch_id: qrData.branch_id,
        timestamp: qrData.timestamp,
        nonce: qrData.nonce,
      });
      const isValid = await verifyHmac(dataToVerify, qrData.hmac);
      if (!isValid) {
        return errorResponse("INVALID_QR", "Mã QR không hợp lệ hoặc đã bị thay đổi.", 400);
      }

      // Check expiry
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - qrData.timestamp > QR_EXPIRY_SECONDS) {
        return errorResponse("QR_EXPIRED", "Mã QR đã hết hạn. Vui lòng quét mã mới.", 400);
      }

      branchId = qrData.branch_id;

    // ─── Geolocation Method ───
    } else if (method === "geolocation") {
      if (!body.branch_id || body.latitude == null || body.longitude == null) {
        return errorResponse(
          "VALIDATION_ERROR",
          "Phương thức geolocation yêu cầu branch_id, latitude và longitude.",
          400,
        );
      }

      branchId = body.branch_id;

      // Get branch location
      const { data: branch, error: branchError } = await adminClient
        .from("branches")
        .select("id, latitude, longitude")
        .eq("id", branchId)
        .single();

      if (branchError || !branch) {
        return errorResponse("NOT_FOUND", "Không tìm thấy chi nhánh.", 404);
      }

      if (branch.latitude == null || branch.longitude == null) {
        return errorResponse(
          "INTERNAL_ERROR",
          "Chi nhánh chưa được cấu hình vị trí. Vui lòng liên hệ hỗ trợ.",
          500,
        );
      }

      // Check distance
      const distance = haversineMeters(
        body.latitude,
        body.longitude,
        Number(branch.latitude),
        Number(branch.longitude),
      );

      if (distance > GEO_MAX_DISTANCE_METERS) {
        return errorResponse(
          "INVALID_LOCATION",
          `Bạn đang ở cách quán ${Math.round(distance)}m. Vui lòng đến gần hơn (trong ${GEO_MAX_DISTANCE_METERS}m).`,
          400,
        );
      }
    } else {
      return errorResponse("VALIDATION_ERROR", "Phương thức check-in không hợp lệ.", 400);
    }

    // Check daily duplicate
    const today = new Date().toISOString().split("T")[0];
    const { data: existingCheckin } = await adminClient
      .from("checkins")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("branch_id", branchId)
      .gte("checked_in_at", `${today}T00:00:00.000Z`)
      .lt("checked_in_at", `${today}T23:59:59.999Z`)
      .maybeSingle();

    if (existingCheckin) {
      return errorResponse(
        "ALREADY_CHECKED_IN",
        "Bạn đã check-in chi nhánh này hôm nay rồi.",
        409,
      );
    }

    // Calculate streak
    let newStreakDays = 1;
    if (customer.last_checkin_date) {
      const lastDate = new Date(customer.last_checkin_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        // Consecutive day
        newStreakDays = (customer.streak_days ?? 0) + 1;
      } else if (diffDays === 0) {
        // Same day — keep streak
        newStreakDays = customer.streak_days ?? 1;
      }
      // diffDays > 1 → streak resets to 1
    }

    // Calculate streak bonus
    let streakBonus = 0;
    if (STREAK_MILESTONES[newStreakDays]) {
      streakBonus = STREAK_MILESTONES[newStreakDays];
    }

    const totalPointsEarned = CHECKIN_POINTS_BASE + streakBonus;
    const newAvailablePoints = customer.available_points + totalPointsEarned;
    const newTotalPoints = customer.total_points + totalPointsEarned;
    const newVersion = customer.version + 1;

    // Update customer
    const { error: updateError } = await adminClient
      .from("customers")
      .update({
        available_points: newAvailablePoints,
        total_points: newTotalPoints,
        lifetime_points: (customer as any).lifetime_points
          ? (customer as any).lifetime_points + totalPointsEarned
          : totalPointsEarned,
        version: newVersion,
        streak_days: newStreakDays,
        last_checkin_date: today,
      })
      .eq("id", customer.id)
      .eq("version", customer.version);

    if (updateError) {
      return errorResponse(
        "VERSION_CONFLICT",
        "Dữ liệu đã bị thay đổi. Vui lòng thử lại.",
        409,
      );
    }

    // Create checkin record
    const { data: checkin, error: checkinError } = await adminClient
      .from("checkins")
      .insert({
        customer_id: customer.id,
        branch_id: branchId,
        tenant_id: customer.tenant_id,
        method,
        device_fingerprint: body.device_fingerprint,
        points_earned: totalPointsEarned,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
      })
      .select("id, checked_in_at")
      .single();

    if (checkinError) {
      console.error("Lỗi tạo checkin:", checkinError);
    }

    // Create loyalty transaction
    await adminClient
      .from("loyalty_transactions")
      .insert({
        customer_id: customer.id,
        tenant_id: customer.tenant_id,
        points: totalPointsEarned,
        type: "checkin_bonus",
        reference_type: "checkin",
        reference_id: checkin?.id ?? null,
        balance_after: newAvailablePoints,
        description: `Check-in chi nhánh`,
      });

    // Get branch info for response
    const { data: branch } = await adminClient
      .from("branches")
      .select("id, name, address")
      .eq("id", branchId)
      .single();

    // Find next streak milestone
    const milestoneKeys = Object.keys(STREAK_MILESTONES)
      .map(Number)
      .sort((a, b) => a - b);
    const nextMilestone = milestoneKeys.find((m) => m > newStreakDays) ?? milestoneKeys[milestoneKeys.length - 1];
    const nextMilestoneBonus = STREAK_MILESTONES[nextMilestone] ?? 0;

    const responseData = {
      checkin_id: checkin?.id ?? null,
      branch: branch
        ? { id: branch.id, name: branch.name, address: branch.address }
        : { id: branchId, name: "", address: "" },
      points_earned: totalPointsEarned,
      new_balance: newAvailablePoints,
      streak: {
        current: newStreakDays,
        bonus: streakBonus,
        next_milestone: nextMilestone,
        next_milestone_bonus: nextMilestoneBonus,
      },
      checked_in_at: checkin?.checked_in_at ?? new Date().toISOString(),
    };

    if (idempotencyKey) {
      await saveIdempotencyResponse(adminClient, idempotencyKey, { success: true, data: responseData }, 200);
    }

    return successResponse(responseData);
  } catch (err) {
    console.error("Lỗi hệ thống khi check-in:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
