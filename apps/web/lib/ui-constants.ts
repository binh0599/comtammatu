/** Badge variant maps for order statuses — shared across POS views */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const ORDER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "secondary",
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
  completed: "default",
  cancelled: "destructive",
};
