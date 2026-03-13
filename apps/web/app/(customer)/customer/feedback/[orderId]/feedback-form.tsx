"use client";

import { useState, useTransition } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { formatPrice, formatDateTime } from "@comtammatu/shared";
import { submitFeedback } from "../../actions";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Label,
  Separator,
  Textarea,
  cn,
} from "@comtammatu/ui";

interface OrderItem {
  id: number;
  quantity: number;
  unit_price: number;
  item_total: number;
  menu_items: { name: string } | null;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  branch_id: number;
  order_items: OrderItem[];
}

interface FeedbackFormProps {
  order: Order;
  alreadyReviewed: boolean;
}

export function FeedbackForm({ order, alreadyReviewed }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(alreadyReviewed);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (rating === 0) {
      toast.error("Vui lòng chọn số sao");
      return;
    }

    startTransition(async () => {
      const result = await submitFeedback({
        order_id: order.id,
        branch_id: order.branch_id,
        rating,
        comment: comment.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setSubmitted(true);
        toast.success("Cảm ơn bạn đã đánh giá!");
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">Cảm ơn bạn đã đánh giá!</h2>
        <p className="text-muted-foreground text-center text-sm">
          Phản hồi của bạn giúp chúng tôi cải thiện chất lượng phục vụ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đánh giá đơn hàng</h1>

      {/* Order summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">#{order.order_number}</span>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <span className="text-primary font-semibold">
              {formatPrice(order.total)}
            </span>
          </div>
          <Separator className="my-3" />
          <div className="space-y-1">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.menu_items?.name ?? "Món ăn"} x{item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatPrice(item.item_total)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Star rating */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Chất lượng dịch vụ</Label>
        <div
          role="group"
          aria-label="Đánh giá sao"
          className="flex items-center justify-center gap-2"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`Đánh giá ${star} sao`}
              aria-pressed={rating === star}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg transition-all",
                "hover:scale-110 active:scale-95"
              )}
            >
              <Star
                aria-hidden="true"
                className={cn(
                  "h-8 w-8 transition-colors",
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-muted-foreground text-center text-sm">
            {rating === 1 && "Rất tệ"}
            {rating === 2 && "Chưa hài lòng"}
            {rating === 3 && "Bình thường"}
            {rating === 4 && "Hài lòng"}
            {rating === 5 && "Tuyệt vời!"}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment">Nhận xét (không bắt buộc)</Label>
        <Textarea
          id="comment"
          placeholder="Chia sẻ trải nghiệm của bạn..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-muted-foreground text-right text-xs">
          {comment.length}/1000
        </p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isPending || rating === 0}
        className="w-full"
        size="lg"
      >
        {isPending ? "Đang gửi..." : "Gửi đánh giá"}
      </Button>
    </div>
  );
}
