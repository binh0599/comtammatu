"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Star, MessageSquare } from "lucide-react";
import { formatDateTime } from "@comtammatu/shared";
import { respondToFeedback } from "./actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@comtammatu/ui";

interface Feedback {
  id: number;
  customer_id: number | null;
  order_id: number | null;
  branch_id: number;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_by: string | null;
  created_at: string;
  customers: { full_name: string; tenant_id: number } | null;
  orders: { order_number: string } | null;
  branches: { name: string } | null;
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function FeedbackTab({ feedback }: { feedback: Feedback[] }) {
  const [respondingItem, setRespondingItem] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRespond(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!respondingItem) return;

    setError(null);
    const formData = new FormData(e.currentTarget);
    const response = formData.get("response") as string;

    startTransition(async () => {
      const result = await respondToFeedback(respondingItem.id, { response });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setRespondingItem(null);
        setError(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Phản hồi</h2>
          <p className="text-muted-foreground">
            Xem và phản hồi đánh giá từ khách hàng
          </p>
        </div>
      </div>

      {error && !respondingItem && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Khách hàng</TableHead>
              <TableHead scope="col">Đơn hàng</TableHead>
              <TableHead scope="col">Chi nhánh</TableHead>
              <TableHead scope="col">Đánh giá</TableHead>
              <TableHead scope="col">Bình luận</TableHead>
              <TableHead scope="col">Phản hồi</TableHead>
              <TableHead scope="col">Ngày</TableHead>
              <TableHead scope="col" className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedback.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="text-muted-foreground/50 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      Chưa có phản hồi nào
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.customers?.full_name ?? "Khách vãng lai"}
                  </TableCell>
                  <TableCell>
                    {item.orders?.order_number ?? "-"}
                  </TableCell>
                  <TableCell>{item.branches?.name ?? "-"}</TableCell>
                  <TableCell>
                    <RatingDisplay rating={item.rating} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.comment ?? "-"}
                  </TableCell>
                  <TableCell>
                    {item.response ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        Đã phản hồi
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Chưa phản hồi</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={item.response ? "Xem phản hồi" : "Phản hồi"}
                      onClick={() => {
                        setError(null);
                        setRespondingItem(item);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {/* Respond Dialog */}
      <Dialog
        open={!!respondingItem}
        onOpenChange={(open) => {
          if (!open) {
            setRespondingItem(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {respondingItem?.response ? "Chi tiết phản hồi" : "Phản hồi khách hàng"}
            </DialogTitle>
            <DialogDescription>
              Đánh giá từ{" "}
              {respondingItem?.customers?.full_name ?? "Khách vãng lai"}
              {respondingItem?.orders?.order_number
                ? ` — Đơn #${respondingItem.orders.order_number}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {respondingItem && (
            <div className="space-y-4">
              {/* Rating & Comment Display */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <RatingDisplay rating={respondingItem.rating} />
                  <span className="text-muted-foreground text-sm">
                    {formatDateTime(respondingItem.created_at)}
                  </span>
                </div>
                {respondingItem.comment && (
                  <p className="text-sm">{respondingItem.comment}</p>
                )}
              </div>

              {/* Existing response display */}
              {respondingItem.response && (
                <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">
                    Phản hồi của nhà hàng:
                  </p>
                  <p className="text-sm text-green-700">
                    {respondingItem.response}
                  </p>
                </div>
              )}

              {/* Response form (only show if not already responded) */}
              {!respondingItem.response && (
                <form onSubmit={handleRespond}>
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="response">Phản hồi</Label>
                    <Textarea
                      id="response"
                      name="response"
                      placeholder="Nhập phản hồi cho khách hàng..."
                      rows={4}
                      required
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Đang gửi..." : "Gửi phản hồi"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
