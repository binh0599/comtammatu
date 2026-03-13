import { Badge } from "./badge";
import { cn } from "./lib/utils";

export type StatusVariant = "default" | "secondary" | "outline" | "destructive";

export interface StatusBadgeProps {
  /** Nhãn hiển thị */
  label: string;
  /** Variant của Badge */
  variant?: StatusVariant;
  /** Custom className (ví dụ: "bg-green-100 text-green-800 hover:bg-green-100") */
  className?: string;
}

/**
 * Badge hiển thị trạng thái với variant hoặc custom color.
 *
 * @example
 * // Dùng variant
 * <StatusBadge label="Hoạt động" variant="default" />
 *
 * @example
 * // Dùng custom color
 * <StatusBadge label="Hoàn thành" className="bg-green-100 text-green-800" />
 */
export function StatusBadge({
  label,
  variant = "secondary",
  className,
}: StatusBadgeProps) {
  return (
    <Badge variant={variant} className={cn(className)}>
      {label}
    </Badge>
  );
}

/**
 * Tạo StatusBadge từ map trạng thái.
 * Tiện dùng khi có nhiều trạng thái với variant/color khác nhau.
 *
 * @example
 * const config = {
 *   active: { label: "Hoạt động", variant: "default" as const },
 *   inactive: { label: "Ngưng", variant: "secondary" as const },
 *   suspended: { label: "Tạm dừng", variant: "destructive" as const },
 * };
 *
 * <MappedStatusBadge status="active" config={config} />
 */
export interface StatusConfig {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

export interface MappedStatusBadgeProps<T extends string> {
  /** Trạng thái hiện tại */
  status: T;
  /** Map trạng thái -> cấu hình badge */
  config: Record<T, StatusConfig>;
  /** Fallback khi status không có trong config */
  fallback?: StatusConfig;
}

export function MappedStatusBadge<T extends string>({
  status,
  config,
  fallback = { label: status, variant: "secondary" },
}: MappedStatusBadgeProps<T>) {
  const cfg = config[status] ?? fallback;
  return (
    <StatusBadge
      label={cfg.label}
      variant={cfg.variant}
      className={cfg.className}
    />
  );
}
