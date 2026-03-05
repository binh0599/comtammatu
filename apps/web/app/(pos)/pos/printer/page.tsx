import {
  getCurrentTerminal,
  getPrintersForTerminal,
} from "./actions";
import { PrinterSettings } from "./printer-settings";

export default async function PrinterPage() {
  const terminal = await getCurrentTerminal();

  if (!terminal) {
    return (
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Cài đặt máy in</h1>
        </div>
        <div className="rounded-lg border bg-yellow-50 p-6 text-center dark:bg-yellow-950">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            Chưa mở ca
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mt-2 text-sm">
            Vui lòng mở ca thu ngân trước để xem máy in kết nối với thiết bị này.
          </p>
        </div>
      </div>
    );
  }

  const printers = await getPrintersForTerminal(terminal.id);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Máy in — {terminal.name}</h1>
        <p className="text-muted-foreground text-sm">
          Quản lý máy in kết nối với thiết bị này
        </p>
      </div>
      <PrinterSettings
        initialPrinters={printers ?? []}
        terminalId={terminal.id}
        terminalName={terminal.name}
      />
    </div>
  );
}
