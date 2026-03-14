import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "./lib/utils";

export interface StatCardProps {
  /** Nhãn hiển thị (ví dụ: "Doanh thu hôm nay") */
  title: string;
  /** Giá trị chính (ví dụ: "1.500.000₫") */
  value: string | number;
  /** Mô tả phụ bên dưới giá trị */
  sub?: string;
  /** Lucide icon */
  icon?: LucideIcon;
  /** Tailwind classes cho icon container (ví dụ: "bg-emerald-100 text-emerald-700") */
  iconClassName?: string;
  /** Thêm class cho Card root */
  className?: string;
}

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClassName,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn("flex size-8 items-center justify-center rounded-lg", iconClassName)}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export interface StatCardGridProps {
  children: React.ReactNode;
  /** Số cột trên desktop (mặc định: 4) */
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  return <div className={cn("grid gap-4", columnClasses[columns], className)}>{children}</div>;
}
