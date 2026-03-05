import {
  getPrintersForBranch,
  getTerminalsForBranch,
  getKdsStationsForBranch,
} from "./actions";
import { PrinterSettings } from "./printer-settings";

export default async function PrinterPage() {
  const [printers, terminals, stations] = await Promise.all([
    getPrintersForBranch(),
    getTerminalsForBranch(),
    getKdsStationsForBranch(),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt máy in</h1>
        <p className="text-muted-foreground text-sm">
          Kết nối và quản lý máy in cho chi nhánh của bạn
        </p>
      </div>
      <PrinterSettings
        initialPrinters={printers ?? []}
        terminals={terminals ?? []}
        stations={stations ?? []}
      />
    </div>
  );
}
