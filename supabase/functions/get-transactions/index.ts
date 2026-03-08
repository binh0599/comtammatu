import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateQuery, z } from "../_shared/validate.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";

const TransactionsQuerySchema = z.object({
  cursor: z
    .string()
    .regex(/^\d+$/, "cursor phải là số nguyên.")
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit phải là số nguyên.")
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default("20"),
  type: z
    .enum(["earn", "redeem", "checkin_bonus", "cashback", "expire", "adjust"])
    .optional(),
  sort: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc"),
});

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "GET") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức GET.", 405);
  }

  // Auth: customer required
  const [user, authError] = await extractUser(req, ["customer"]);
  if (authError) return authError;

  // Validate query params
  const [params, validationError] = validateQuery(req, TransactionsQuerySchema);
  if (validationError) return validationError;

  const { cursor, limit, type, sort } = params;

  try {
    const adminClient = createAdminClient();

    // Get customer
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return errorResponse("NOT_FOUND", "Không tìm thấy thông tin thành viên.", 404);
    }

    // Build query
    let query = adminClient
      .from("loyalty_transactions")
      .select("id, type, points, balance_after, description, reference_type, reference_id, created_at")
      .eq("customer_id", customer.id)
      .order("id", { ascending: sort === "asc" })
      .limit(limit + 1); // Fetch one extra to determine has_next

    // Filter by type
    if (type) {
      query = query.eq("type", type);
    }

    // Cursor-based pagination
    if (cursor) {
      if (sort === "desc") {
        query = query.lt("id", cursor);
      } else {
        query = query.gt("id", cursor);
      }
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error("Lỗi lấy giao dịch:", txError);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể tải lịch sử giao dịch.",
        500,
      );
    }

    const items = transactions ?? [];
    const hasNext = items.length > limit;

    // Trim extra item
    if (hasNext) {
      items.pop();
    }

    const lastItem = items[items.length - 1];

    return successResponse(
      {
        transactions: items.map((t) => ({
          id: t.id,
          type: t.type,
          points: t.points,
          balance_after: t.balance_after,
          description: t.description ?? descriptionForType(t.type),
          reference_type: t.reference_type,
          reference_id: t.reference_id,
          created_at: t.created_at,
        })),
      },
      {
        cursor: lastItem ? String(lastItem.id) : undefined,
        has_next: hasNext,
        limit,
      },
    );
  } catch (err) {
    console.error("Lỗi hệ thống khi lấy giao dịch:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});

function descriptionForType(type: string): string {
  switch (type) {
    case "earn":
      return "Tích điểm";
    case "redeem":
      return "Đổi điểm lấy phần thưởng";
    case "checkin_bonus":
      return "Điểm thưởng check-in";
    case "cashback":
      return "Hoàn điểm cashback";
    case "expire":
      return "Điểm hết hạn";
    case "adjust":
      return "Điều chỉnh điểm";
    default:
      return "Giao dịch điểm";
  }
}
