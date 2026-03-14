import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentTerminal, getPrintersForTerminal, getTerminalsForBranch } from "./actions";
import { PrinterSettings } from "./printer-settings";
import { Button } from "@comtammatu/ui";

interface PrinterPageProps {
  searchParams: Promise<{ terminalId?: string }>;
}

export default async function PrinterPage({ searchParams }: PrinterPageProps) {
  const params = await searchParams;

  // 1. If user has an open session, auto-detect terminal
  const sessionTerminal = await getCurrentTerminal();

  // 2. Determine which terminal to show
  const terminalIdParam = params.terminalId ? Number(params.terminalId) : null;
  const terminals = await getTerminalsForBranch();
  const terminalList = (terminals ?? []) as { id: number; name: string; type: string }[];

  // If session is open and no explicit terminalId, redirect to session's terminal
  if (sessionTerminal && !terminalIdParam) {
    redirect(`/pos/printer?terminalId=${sessionTerminal.id}`);
  }

  // If no terminalId param and only 1 terminal, redirect to it
  if (!terminalIdParam && terminalList.length === 1) {
    redirect(`/pos/printer?terminalId=${terminalList[0]!.id}`);
  }

  // No terminalId — show terminal picker
  if (!terminalIdParam) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label="Quay lại">
            <Link href="/pos">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cài đặt máy in</h1>
            <p className="text-muted-foreground text-sm">Chọn thiết bị POS để quản lý máy in</p>
          </div>
        </div>
        {terminalList.length === 0 ? (
          <div className="rounded-lg border bg-yellow-50 p-6 text-center dark:bg-yellow-950">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Chưa có thiết bị POS nào. Vui lòng liên hệ quản lý để tạo thiết bị.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-md">
            {terminalList.map((t) => (
              <Link key={t.id} href={`/pos/printer?terminalId=${t.id}`}>
                <Button variant="outline" className="w-full justify-start text-left">
                  {t.name}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Terminal selected — verify it exists in branch
  const currentTerminal = terminalList.find((t) => t.id === terminalIdParam);
  if (!currentTerminal) notFound();

  const printers = await getPrintersForTerminal(currentTerminal.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        {terminalList.length > 1 && (
          <Button variant="ghost" size="icon" asChild aria-label="Quay lại chọn thiết bị">
            <Link href="/pos/printer">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Máy in — {currentTerminal.name}</h1>
          <p className="text-muted-foreground text-sm">Quản lý máy in kết nối với thiết bị này</p>
        </div>
      </div>
      <PrinterSettings
        initialPrinters={(printers ?? []) as any}
        terminalId={currentTerminal.id}
        terminalName={currentTerminal.name}
      />
    </div>
  );
}
