import { z } from "zod";

// ===== Side item (added alongside a main dish) =====

const sideItemInput = z.object({
  menu_item_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
  notes: z.string().max(200).nullish(),
});

// ===== Order Item (used in create + add items) =====

const orderItemInput = z.object({
  menu_item_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullish(),
  quantity: z.number().int().positive().max(99),
  modifiers: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().min(0),
      })
    )
    .nullish(),
  notes: z.string().max(200).nullish(),
  side_items: z.array(sideItemInput).nullish(),
});

// ===== Create Order =====

export const createOrderSchema = z
  .object({
    table_id: z.number().int().positive().nullish(),
    type: z.enum(["dine_in", "takeaway", "delivery"]),
    notes: z.string().max(500).nullish(),
    guest_count: z.number().int().positive().max(20).nullish(),
    items: z.array(orderItemInput).min(1, "Đơn hàng phải có ít nhất 1 món"),
    idempotency_key: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "dine_in") {
      if (data.table_id == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["table_id"],
          message: "Đơn tại bàn phải chọn bàn",
        });
      }
      if (data.guest_count == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guest_count"],
          message: "Đơn tại bàn phải có số khách",
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ===== Update Order Status =====

export const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["confirmed", "preparing", "ready", "served", "completed", "cancelled"]),
  reason: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ===== Add Items to Existing Order =====

export const addOrderItemsSchema = z.object({
  order_id: z.number().int().positive(),
  items: z.array(orderItemInput).min(1, "Phải có ít nhất 1 món"),
});

export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;

// ===== Remove Order Item =====

export const removeOrderItemSchema = z.object({
  order_id: z.number().int().positive(),
  item_id: z.number().int().positive(),
});

export type RemoveOrderItemInput = z.infer<typeof removeOrderItemSchema>;

// ===== Update Order Item Quantity =====

export const updateOrderItemSchema = z.object({
  order_id: z.number().int().positive(),
  item_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
});

export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;

// ===== Transfer Order to Another Table =====

export const transferOrderTableSchema = z.object({
  order_id: z.number().int().positive(),
  new_table_id: z.number().int().positive(),
});

export type TransferOrderTableInput = z.infer<typeof transferOrderTableSchema>;

// ===== Update Guest Count =====

export const updateGuestCountSchema = z.object({
  order_id: z.number().int().positive(),
  guest_count: z.number().int().positive().max(20),
});

export type UpdateGuestCountInput = z.infer<typeof updateGuestCountSchema>;

// ===== Update Order Notes =====

export const updateOrderNotesSchema = z.object({
  order_id: z.number().int().positive(),
  notes: z.string().max(500).nullish(),
});
