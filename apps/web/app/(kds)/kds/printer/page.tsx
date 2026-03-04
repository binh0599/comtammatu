import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPrintersForBranch, getKdsStationsForBranch } from "./actions";
import { KdsPrinterSettings } from "./kds-printer-settings";

export default async function KdsPrinterPage() {
  const [printers, stations] = await Promise.all([
    getPrintersForBranch(),
    getKdsStationsForBranch(),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kds">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cài đặt máy in KDS</h1>
          <p className="text-muted-foreground text-sm">
            Kết nối máy in nhiệt cho các trạm bếp
          </p>
        </div>
      </div>
      <KdsPrinterSettings
        initialPrinters={printers ?? []}
        stations={stations ?? []}
      />
    </div>
  );
}
