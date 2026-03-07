import { z } from "zod";

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
  notification_types: z
    .array(z.enum(["order_status", "low_stock", "campaign", "reservation", "payment", "system"]))
    .min(1),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url(),
});

export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;

export const sendPushNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  icon: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(["order_status", "low_stock", "campaign", "reservation", "payment", "system"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type SendPushNotificationInput = z.infer<typeof sendPushNotificationSchema>;
