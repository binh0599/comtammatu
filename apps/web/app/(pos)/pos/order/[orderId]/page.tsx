import { notFound } from "next/navigation";
import { getOrderDetail } from "../../orders/actions";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const id = Number(orderId);

  if (isNaN(id)) notFound();

  const order = await getOrderDetail(id);
  if (!order) notFound();

  return <OrderDetailClient order={order} />;
}
