"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getStationTickets,
  getStationInfo,
  getTimingRules,
} from "@/app/(kds)/kds/[stationId]/actions";

export function useStationTicketsQuery(stationId: number) {
  return useQuery({
    queryKey: queryKeys.kds.tickets(stationId),
    queryFn: () => getStationTickets(stationId),
    enabled: stationId > 0,
    refetchInterval: 10_000, // làm mới mỗi 10 giây cho KDS
  });
}

export function useStationInfoQuery(stationId: number) {
  return useQuery({
    queryKey: [...queryKeys.kds.stations, stationId] as const,
    queryFn: () => getStationInfo(stationId),
    enabled: stationId > 0,
    staleTime: 10 * 60 * 1000, // thông tin trạm ít thay đổi
  });
}

export function useTimingRulesQuery(stationId: number) {
  return useQuery({
    queryKey: ["kds", "timing-rules", stationId] as const,
    queryFn: () => getTimingRules(stationId),
    enabled: stationId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
