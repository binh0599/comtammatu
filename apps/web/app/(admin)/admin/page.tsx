import { Header } from "@/components/admin/header";

export default function AdminDashboard() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl p-6">
            <h3 className="text-muted-foreground text-sm font-medium">
              Doanh thu hôm nay
            </h3>
            <p className="mt-2 text-2xl font-bold">0 ₫</p>
          </div>
          <div className="bg-muted/50 aspect-video rounded-xl p-6">
            <h3 className="text-muted-foreground text-sm font-medium">
              Đơn hàng
            </h3>
            <p className="mt-2 text-2xl font-bold">0</p>
          </div>
          <div className="bg-muted/50 aspect-video rounded-xl p-6">
            <h3 className="text-muted-foreground text-sm font-medium">
              Khách hàng mới
            </h3>
            <p className="mt-2 text-2xl font-bold">0</p>
          </div>
        </div>
        <div className="bg-muted/50 min-h-[50vh] flex-1 rounded-xl p-6">
          <h3 className="text-muted-foreground text-sm font-medium">
            Biểu đồ doanh thu
          </h3>
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Dữ liệu sẽ hiển thị khi có đơn hàng
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
