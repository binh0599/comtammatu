import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";
import { checkIdempotency, saveIdempotencyResponse } from "../_shared/idempotency.ts";

const OrderItemSchema = z.object({
  menu_item_id: z.number().int().positive("ID món ăn phải là số nguyên dương."),
  quantity: z.number().int().min(1, "Số lượng phải ít nhất là 1.").max(99, "Số lượng tối đa là 99."),
  note: z.string().max(200, "Ghi chú tối đa 200 ký tự.").optional().default(""),
});

const NewAddressSchema = z.object({
  label: z.string().min(1).max(50).default("Nhà"),
  full_address: z.string().min(1, "Địa chỉ không được để trống."),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().optional(),
  note: z.string().max(200).optional(),
});

const CreateDeliveryOrderSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, "Đơn hàng phải có ít nhất 1 món.")
    .max(50, "Đơn hàng tối đa 50 món."),
  address_id: z.number().int().positive().optional(),
  address: NewAddressSchema.optional(),
  payment_method: z.enum(["cod", "momo", "zalopay", "bank_transfer"], {
    errorMap: () => ({ message: "Phương thức thanh toán không hợp lệ." }),
  }),
  coupon_code: z.string().optional(),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự.").optional(),
}).refine(
  (data) => data.address_id || data.address,
  { message: "Vui lòng chọn hoặc nhập địa chỉ giao hàng.", path: ["address"] },
);

// Delivery zone pricing
const DELIVERY_ZONES = [
  { name: "zone_a", maxKm: 3, fee: 15000 },
  { name: "zone_b", maxKm: 5, fee: 20000 },
  { name: "zone_c", maxKm: 8, fee: 30000 },
];
const FREE_DELIVERY_THRESHOLD = 200000;

/**
 * Haversine distance in km.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Generate order number: ORD-YYYY-MMDD-XXXXX
 */
function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `ORD-${y}-${m}${d}-${rand}`;
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
  const [body, validationError] = await validateBody(req, CreateDeliveryOrderSchema);
  if (validationError) return validationError;

  try {
    // 1. Get customer
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select("id, tenant_id, loyalty_tier_id")
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return errorResponse("NOT_FOUND", "Không tìm thấy thông tin thành viên.", 404);
    }

    // 2. Resolve delivery address
    let deliveryLat: number;
    let deliveryLng: number;
    let deliveryAddress: Record<string, unknown>;
    let addressId: number | null = null;

    if (body.address_id) {
      const { data: savedAddr, error: addrError } = await adminClient
        .from("customer_addresses")
        .select("id, label, full_address, latitude, longitude, phone, note")
        .eq("id", body.address_id)
        .eq("customer_id", customer.id)
        .single();

      if (addrError || !savedAddr) {
        return errorResponse("NOT_FOUND", "Không tìm thấy địa chỉ đã lưu.", 404);
      }

      deliveryLat = Number(savedAddr.latitude);
      deliveryLng = Number(savedAddr.longitude);
      deliveryAddress = savedAddr;
      addressId = savedAddr.id;
    } else if (body.address) {
      deliveryLat = body.address.latitude;
      deliveryLng = body.address.longitude;
      deliveryAddress = body.address;

      // Optionally save the new address
      const { data: newAddr } = await adminClient
        .from("customer_addresses")
        .insert({
          customer_id: customer.id,
          tenant_id: customer.tenant_id,
          label: body.address.label,
          full_address: body.address.full_address,
          latitude: body.address.latitude,
          longitude: body.address.longitude,
          phone: body.address.phone,
          note: body.address.note,
        })
        .select("id")
        .single();

      addressId = newAddr?.id ?? null;
    } else {
      return errorResponse("VALIDATION_ERROR", "Vui lòng cung cấp địa chỉ giao hàng.", 400);
    }

    // 3. Find nearest active branch
    const { data: branches } = await adminClient
      .from("branches")
      .select("id, name, latitude, longitude, is_active")
      .eq("tenant_id", customer.tenant_id)
      .eq("is_active", true);

    if (!branches || branches.length === 0) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Hiện không có chi nhánh nào hoạt động. Vui lòng thử lại sau.",
        503,
      );
    }

    // Find closest branch with lat/lng
    let closestBranch: (typeof branches)[0] | null = null;
    let closestDistance = Infinity;

    for (const b of branches) {
      if (b.latitude == null || b.longitude == null) continue;
      const dist = haversineKm(deliveryLat, deliveryLng, Number(b.latitude), Number(b.longitude));
      if (dist < closestDistance) {
        closestDistance = dist;
        closestBranch = b;
      }
    }

    if (!closestBranch) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Không thể xác định chi nhánh gần nhất. Vui lòng liên hệ hỗ trợ.",
        503,
      );
    }

    // 4. Check delivery zone
    const zone = DELIVERY_ZONES.find((z) => closestDistance <= z.maxKm);
    if (!zone) {
      return errorResponse(
        "OUT_OF_DELIVERY_ZONE",
        `Địa chỉ nằm ngoài vùng giao hàng (${closestDistance.toFixed(1)}km). Vùng giao hàng tối đa là 8km.`,
        422,
      );
    }

    // 5. Fetch menu items and calculate subtotal
    const menuItemIds = body.items.map((i) => i.menu_item_id);
    const { data: menuItems, error: menuError } = await adminClient
      .from("menu_items")
      .select("id, name, base_price, is_available")
      .in("id", menuItemIds);

    if (menuError || !menuItems) {
      return errorResponse("INTERNAL_ERROR", "Không thể lấy thông tin món ăn.", 500);
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Validate all items exist and are available
    const orderItems: Array<{
      menu_item_id: number;
      name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      note: string;
    }> = [];

    for (const item of body.items) {
      const menuItem = menuItemMap.get(item.menu_item_id);
      if (!menuItem) {
        return errorResponse(
          "NOT_FOUND",
          `Món ăn với ID ${item.menu_item_id} không tồn tại.`,
          404,
        );
      }
      if (!menuItem.is_available) {
        return errorResponse(
          "BUSINESS_RULE_VIOLATION",
          `Món "${menuItem.name}" hiện đã hết. Vui lòng chọn món khác.`,
          422,
        );
      }

      const unitPrice = Number(menuItem.base_price);
      orderItems.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
        note: item.note ?? "",
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 6. Calculate delivery fee (free if above threshold)
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zone.fee;

    // 7. Apply coupon discount
    let discount = 0;
    if (body.coupon_code) {
      const { data: voucher } = await adminClient
        .from("vouchers")
        .select("id, type, value, min_order, max_discount, max_uses, used_count, is_active, valid_from, valid_to")
        .eq("code", body.coupon_code)
        .eq("tenant_id", customer.tenant_id)
        .eq("is_active", true)
        .single();

      if (voucher) {
        const now = new Date();
        const validFrom = new Date(voucher.valid_from);
        const validTo = new Date(voucher.valid_to);

        if (now >= validFrom && now <= validTo) {
          if (!voucher.max_uses || voucher.used_count < voucher.max_uses) {
            if (!voucher.min_order || subtotal >= Number(voucher.min_order)) {
              if (voucher.type === "percent") {
                discount = Math.floor(subtotal * Number(voucher.value) / 100);
                if (voucher.max_discount) {
                  discount = Math.min(discount, Number(voucher.max_discount));
                }
              } else {
                discount = Number(voucher.value);
              }

              // Increment used_count
              await adminClient
                .from("vouchers")
                .update({ used_count: voucher.used_count + 1 })
                .eq("id", voucher.id);
            }
          }
        }
      }
    }

    const total = subtotal + deliveryFee - discount;

    // 8. Get tier multiplier for points estimation
    let tierMultiplier = 1.0;
    if (customer.loyalty_tier_id) {
      const { data: tier } = await adminClient
        .from("loyalty_tiers")
        .select("point_multiplier")
        .eq("id", customer.loyalty_tier_id)
        .single();
      if (tier) tierMultiplier = Number(tier.point_multiplier);
    }
    const pointsWillEarn = Math.floor(Math.floor(subtotal / 10000) * tierMultiplier);

    // 9. Create order record
    const orderNumber = generateOrderNumber();
    const idempotencyKeyUuid = idempotencyKey ?? crypto.randomUUID();

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        order_number: orderNumber,
        branch_id: closestBranch.id,
        customer_id: customer.id,
        type: "delivery",
        status: "pending",
        subtotal,
        discount_total: discount,
        tax: 0,
        service_charge: 0,
        total,
        notes: body.note,
        created_by: user.id,
        idempotency_key: idempotencyKeyUuid,
      })
      .select("id, created_at")
      .single();

    if (orderError || !order) {
      console.error("Lỗi tạo đơn hàng:", orderError);
      // Check for duplicate idempotency_key on orders table
      if (orderError?.code === "23505") {
        return errorResponse("DUPLICATE_REQUEST", "Đơn hàng này đã được tạo trước đó.", 409);
      }
      return errorResponse("INTERNAL_ERROR", "Không thể tạo đơn hàng. Vui lòng thử lại.", 500);
    }

    // 10. Create order items
    const orderItemInserts = orderItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_total: item.subtotal,
      notes: item.note || null,
      status: "pending",
    }));

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(orderItemInserts);

    if (itemsError) {
      console.error("Lỗi tạo chi tiết đơn:", itemsError);
    }

    // 11. Create delivery order record
    const estimatedMinutes = zone.name === "zone_a" ? 20 : zone.name === "zone_b" ? 30 : 45;
    const estimatedDeliveryAt = new Date(
      new Date(order.created_at).getTime() + estimatedMinutes * 60 * 1000,
    ).toISOString();

    const { data: deliveryOrder, error: deliveryError } = await adminClient
      .from("delivery_orders")
      .insert({
        order_id: order.id,
        tenant_id: customer.tenant_id,
        address_id: addressId,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryFee,
        status: "pending",
        estimated_delivery_at: estimatedDeliveryAt,
      })
      .select("id")
      .single();

    if (deliveryError) {
      console.error("Lỗi tạo delivery order:", deliveryError);
    }

    const responseData = {
      order_id: order.id,
      delivery_order_id: deliveryOrder?.id ?? null,
      status: "pending",
      items: orderItems.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total,
      estimated_delivery_at: estimatedDeliveryAt,
      points_will_earn: pointsWillEarn,
      created_at: order.created_at,
    };

    if (idempotencyKey) {
      await saveIdempotencyResponse(adminClient, idempotencyKey, { success: true, data: responseData }, 201);
    }

    return successResponse(responseData, undefined, 201);
  } catch (err) {
    console.error("Lỗi hệ thống khi tạo đơn giao hàng:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
