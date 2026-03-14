import type { NextRequest } from "next/server";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/notifications
 * Requires authentication.
 * Fetch customer's notifications ordered by most recent.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, user } = result;

    // Rate limit by user ID
    const rateLimitResponse = await checkMobileRateLimit(`notifications:${user.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Fetch notifications for the user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(
        `
        id,
        title,
        message,
        type,
        data,
        read_at,
        created_at
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching notifications:", error);
      return jsonError(
        "Không thể tải thông báo. Vui lòng thử lại sau.",
        500,
      );
    }

    return jsonOk({
      notifications: notifications ?? [],
    });
  } catch (error) {
    console.error("[GET /api/mobile/notifications]", error);
    return jsonError(
      "Lỗi máy chủ. Vui lòng thử lại sau.",
      500,
    );
  }
}
