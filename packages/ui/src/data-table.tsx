import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { cn } from "./lib/utils";

export interface DataTableColumn<T> {
  /** Unique key cho cột */
  key: string;
  /** Nhãn header */
  label: string;
  /** Render custom cell content */
  render: (item: T, index: number) => React.ReactNode;
  /** Class cho TableHead (ví dụ: "text-right", "w-[100px]") */
  headerClassName?: string;
  /** Class cho TableCell */
  cellClassName?: string;
  /** scope attribute cho TableHead (mặc định: "col") */
  scope?: string;
}

export interface DataTableProps<T> {
  /** Dữ liệu hiển thị */
  data: T[];
  /** Cấu hình cột */
  columns: DataTableColumn<T>[];
  /** Hàm lấy key cho mỗi hàng */
  rowKey: (item: T, index: number) => string | number;
  /** Thông báo khi không có dữ liệu */
  emptyMessage?: string;
  /** Class cho container */
  className?: string;
  /** aria-label cho bảng */
  ariaLabel?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyMessage = "Không có dữ liệu",
  className,
  ariaLabel,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} scope={col.scope ?? "col"} className={col.headerClassName}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={rowKey(item, index)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.cellClassName}>
                    {col.render(item, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
