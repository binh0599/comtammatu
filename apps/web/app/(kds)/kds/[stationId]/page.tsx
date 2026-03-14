import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStationInfo, getStationTickets, getTimingRules } from "./actions";
import { getMenuPortions, getIngredients, getSuppliers } from "./inventory-actions";
import { KdsBoard } from "./kds-board";

export const metadata: Metadata = {
  title: "KDS - Cơm tấm Má Tư",
  description: "Kitchen Display System",
};

export default async function KdsStationPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const id = Number(stationId);

  if (isNaN(id)) notFound();

  const [station, tickets, timingRules, portions, ingredients, suppliers] = await Promise.all([
    getStationInfo(id),
    getStationTickets(id),
    getTimingRules(id),
    getMenuPortions(),
    getIngredients(),
    getSuppliers(),
  ]);

  if (!station || !station.is_active) notFound();

  return (
    <KdsBoard
      stationId={station.id}
      stationName={station.name}
      initialTickets={tickets}
      timingRules={timingRules}
      initialPortions={portions}
      ingredients={ingredients}
      suppliers={suppliers}
    />
  );
}
