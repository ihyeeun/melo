import { useQuery } from "@tanstack/react-query";

import {
  getMenstrualRecorded,
  getMenstruationCycles,
} from "@/features/menstruation/api/menstruation.api";
import type { getCyclesRequest } from "@/features/menstruation/types/menstruation.type";

export function useGetMenstruationCyclesQuery({ date, limit }: getCyclesRequest) {
  return useQuery({
    queryKey: ["menstruation-cycles", { date, limit }],
    queryFn: () => getMenstruationCycles({ date, limit }),
  });
}

export function useGetMenstrualRecordedQuery(date: string) {
  return useQuery({
    queryKey: ["menstrual-recorded", { date }],
    queryFn: () => getMenstrualRecorded(date),
  });
}
