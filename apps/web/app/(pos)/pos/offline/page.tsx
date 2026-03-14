import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center p-6">
      <WifiOff className="mb-4 h-16 w-16 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Không có kết nối mạng</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-center">
        Trang này chưa được lưu trong bộ nhớ đệm. Vui lòng kiểm tra kết nối internet và thử lại.
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        Bạn vẫn có thể tạo đơn hàng mới từ trang đã lưu — đơn sẽ tự động đồng bộ khi có mạng.
      </p>
    </div>
  );
}
