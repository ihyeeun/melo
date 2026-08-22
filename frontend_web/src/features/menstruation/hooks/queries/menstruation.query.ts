import { useQuery } from "@tanstack/react-query";

import {
  getMenstrualRecorded,
  getMenstruationCycles,
} from "@/features/menstruation/api/menstruation.api";
import type { getCyclesRequest } from "@/features/menstruation/types/menstruation.type";

type MenstruationCyclesQueryOptions = {
  enabled?: boolean;
};

export function useGetMenstruationCyclesQuery(
  { date, limit }: getCyclesRequest,
  options?: MenstruationCyclesQueryOptions,
) {
  return useQuery({
    queryKey: ["menstruation-cycles", { date, limit }],
    queryFn: () => getMenstruationCycles({ date, limit }),
    enabled: options?.enabled,
  });
}

export function useGetMenstrualRecordedQuery(date: string) {
  return useQuery({
    queryKey: ["menstrual-recorded", { date }],
    queryFn: () => getMenstrualRecorded(date),
  });
}
