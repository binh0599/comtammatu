"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@comtammatu/shared";
import { openSession, closeSession } from "./actions";

interface Terminal {
  id: number;
  name: string;
  type: string;
}

interface ActiveSession {
  id: number;
  opening_amount: number;
  opened_at: string;
  status: string;
  terminal_id: number;
  pos_terminals: { name: string; type: string } | null;
}

interface SessionSummary {
  totalPayments: number;
  cashTotal: number;
  transactionCount: number;
}

export function OpenSessionForm({
  terminals,
}: {
  terminals: Terminal[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await openSession(formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Mở ca làm việc</CardTitle>
        <CardDescription>
          Chọn thiết bị thu ngân và nhập số tiền đầu ca
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {terminals.length === 0 ? (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
              Chưa có thiết bị thu ngân nào được kích hoạt. Liên hệ quản lý để
              thiết lập.
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="terminal_id">Thiết bị thu ngân</Label>
                <Select name="terminal_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy thu ngân" />
                  </SelectTrigger>
                  <SelectContent>
                    {terminals.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opening_amount">Số tiền đầu ca (VNĐ)</Label>
                <Input
                  id="opening_amount"
                  name="opening_amount"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={500000}
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Số tiền mặt có sẵn khi bắt đầu ca
                </p>
              </div>
            </>
          )}
        </CardContent>
        {terminals.length > 0 && (
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Đang mở ca..." : "Mở ca"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

export function ActiveSessionCard({
  session,
  summary,
}: {
  session: ActiveSession;
  summary: SessionSummary;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closingAmount, setClosingAmount] = useState("");

  const expectedAmount = session.opening_amount + summary.cashTotal;
  const difference = closingAmount
    ? Number(closingAmount) - expectedAmount
    : null;

  const openedAt = new Date(session.opened_at);
  const elapsed = Math.floor(
    (Date.now() - openedAt.getTime()) / (1000 * 60)
  );
  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;

  function handleClose(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await closeSession(formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ca đang mở</CardTitle>
          <Badge variant="default">Đang hoạt động</Badge>
        </div>
        <CardDescription>
          {session.pos_terminals?.name ?? `Máy #${session.terminal_id}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground text-sm">Tiền đầu ca</p>
            <p className="text-lg font-semibold">
              {formatPrice(session.opening_amount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Thời gian</p>
            <p className="text-lg font-semibold">
              {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Thu tiền mặt</p>
            <p className="text-lg font-semibold">
              {formatPrice(summary.cashTotal)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Số giao dịch</p>
            <p className="text-lg font-semibold">{summary.transactionCount}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Dự kiến trong quỹ</span>
            <span>{formatPrice(expectedAmount)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Đóng ca
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={handleClose}>
              <input
                type="hidden"
                name="session_id"
                value={session.id}
              />
              <AlertDialogHeader>
                <AlertDialogTitle>Đóng ca làm việc</AlertDialogTitle>
                <AlertDialogDescription>
                  Kiểm đếm tiền mặt và nhập số tiền thực tế trong quỹ
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="closing_amount">
                    Số tiền thực tế (VNĐ)
                  </Label>
                  <Input
                    id="closing_amount"
                    name="closing_amount"
                    type="number"
                    min={0}
                    step={1000}
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    required
                  />
                </div>

                {difference !== null && (
                  <div
                    className={`rounded-md p-3 text-sm ${
                      difference === 0
                        ? "bg-green-50 text-green-700"
                        : difference > 0
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    <p>
                      Dự kiến: <strong>{formatPrice(expectedAmount)}</strong>
                    </p>
                    <p>
                      Chênh lệch:{" "}
                      <strong>
                        {difference > 0 ? "+" : ""}
                        {formatPrice(difference)}
                      </strong>
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chú (tuỳ chọn)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="VD: Chênh lệch do trả tiền thừa khách"
                    rows={2}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
                <AlertDialogAction type="submit" disabled={isPending}>
                  {isPending ? "Đang đóng..." : "Xác nhận đóng ca"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
