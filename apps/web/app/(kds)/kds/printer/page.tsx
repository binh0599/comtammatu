import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPrintersForStation, getKdsStationsForBranch } from "./actions";
import { KdsPrinterSettings } from "./kds-printer-settings";
import { Button } from "@comtammatu/ui";

interface KdsPrinterPageProps {
  searchParams: Promise<{ stationId?: string }>;
}

export default async function KdsPrinterPage({ searchParams }: KdsPrinterPageProps) {
  const params = await searchParams;
  const stations = await getKdsStationsForBranch();
  const stationList = (stations ?? []) as { id: number; name: string }[];

  // If no stationId provided, redirect to first station or show picker
  const stationId = params.stationId ? Number(params.stationId) : null;

  if (!stationId && stationList.length === 1) {
    redirect(`/kds/printer?stationId=${stationList[0]!.id}`);
  }

  if (!stationId) {
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
            <p className="text-muted-foreground text-sm">Chọn trạm bếp để quản lý máy in</p>
          </div>
        </div>
        {stationList.length === 0 ? (
          <div className="rounded-lg border bg-yellow-50 p-6 text-center dark:bg-yellow-950">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Chưa có trạm bếp nào. Vui lòng tạo trạm bếp trước.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-md">
            {stationList.map((s) => (
              <Link key={s.id} href={`/kds/printer?stationId=${s.id}`}>
                <Button variant="outline" className="w-full justify-start text-left">
                  {s.name}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentStation = stationList.find((s) => s.id === stationId);
  if (!currentStation) notFound();

  const printers = await getPrintersForStation(stationId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kds">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Máy in — {currentStation?.name ?? `Trạm #${stationId}`}
          </h1>
          <p className="text-muted-foreground text-sm">Quản lý máy in kết nối với trạm bếp này</p>
        </div>
      </div>
      <KdsPrinterSettings
        initialPrinters={printers ?? []}
        stationId={stationId}
        stationName={currentStation?.name ?? `Trạm #${stationId}`}
      />
    </div>
  );
}
