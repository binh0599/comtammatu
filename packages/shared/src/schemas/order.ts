import { z } from "zod";

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
      }),
    )
    .nullish(),
  notes: z.string().max(200).nullish(),
});

// ===== Create Order =====

export const createOrderSchema = z.object({
  table_id: z.number().int().positive().nullish(),
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  notes: z.string().max(500).nullish(),
  items: z
    .array(orderItemInput)
    .min(1, "Đơn hàng phải có ít nhất 1 món"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ===== Update Order Status =====

export const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum([
    "confirmed",
    "preparing",
    "ready",
    "served",
    "completed",
    "cancelled",
  ]),
  reason: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ===== Add Items to Existing Order =====

export const addOrderItemsSchema = z.object({
  order_id: z.number().int().positive(),
  items: z
    .array(orderItemInput)
    .min(1, "Phải có ít nhất 1 món"),
});

export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;
