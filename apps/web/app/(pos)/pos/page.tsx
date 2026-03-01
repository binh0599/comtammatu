import { getTables } from "./orders/actions";
import { TableGrid } from "./order/new/table-selector";

export default async function PosPage() {
  const tables = await getTables();

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Sơ đồ bàn</h1>
        <p className="text-muted-foreground text-sm">
          Chọn bàn để tạo đơn hàng mới
        </p>
      </div>
      <TableGrid tables={tables} selectable={false} />
    </div>
  );
}
