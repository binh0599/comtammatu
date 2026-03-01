import { notFound } from "next/navigation";
import { getStationInfo, getStationTickets, getTimingRules } from "./actions";
import { KdsBoard } from "./kds-board";

export default async function KdsStationPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const id = Number(stationId);

  if (isNaN(id)) notFound();

  const [station, tickets, timingRules] = await Promise.all([
    getStationInfo(id),
    getStationTickets(id),
    getTimingRules(id),
  ]);

  if (!station || !station.is_active) notFound();

  return (
    <KdsBoard
      stationId={station.id}
      stationName={station.name}
      initialTickets={tickets}
      timingRules={timingRules}
    />
  );
}
