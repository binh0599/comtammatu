import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Button } from "./button";
import { cn } from "./lib/utils";

export interface ConfirmDialogProps {
  /** Tiêu đề xác nhận (ví dụ: "Xóa thực đơn?") */
  title: string;
  /** Mô tả chi tiết hành động */
  description: string;
  /** Callback khi xác nhận */
  onConfirm: () => void;
  /** Đang xử lý (disable nút + hiện loading text) */
  isPending?: boolean;
  /** Nhãn nút xác nhận (mặc định: "Xóa") */
  confirmLabel?: string;
  /** Nhãn khi đang xử lý (mặc định: "Đang xóa...") */
  pendingLabel?: string;
  /** Nhãn nút hủy (mặc định: "Hủy") */
  cancelLabel?: string;
  /** Hành động nguy hiểm — nút đỏ (mặc định: true) */
  destructive?: boolean;
  /** Nội dung trigger (nếu không truyền sẽ dùng children) */
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  isPending = false,
  confirmLabel = "Xóa",
  pendingLabel = "Đang xóa...",
  cancelLabel = "Hủy",
  destructive = true,
  trigger,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? children ?? (
          <Button variant="ghost" size="icon" aria-label={confirmLabel}>
            <span className="sr-only">{confirmLabel}</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={cn(destructive && "bg-red-600 hover:bg-red-700")}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
