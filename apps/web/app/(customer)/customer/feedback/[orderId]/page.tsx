import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getOrderForFeedback } from "../../actions";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Đánh giá - Cơm tấm Má Tư",
};

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { orderId } = await params;
  const orderIdNum = parseInt(orderId, 10);

  if (isNaN(orderIdNum)) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">Don hang khong hop le</p>
      </div>
    );
  }

  let result: Awaited<ReturnType<typeof getOrderForFeedback>>;
  try {
    result = await getOrderForFeedback(orderIdNum);
  } catch {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">
          Khong the tai thong tin don hang
        </p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">{result.error}</p>
      </div>
    );
  }

  if (!("order" in result) || !result.order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">Don hang khong ton tai</p>
      </div>
    );
  }

  return (
    <FeedbackForm
      order={result.order}
      alreadyReviewed={result.alreadyReviewed ?? false}
    />
  );
}
