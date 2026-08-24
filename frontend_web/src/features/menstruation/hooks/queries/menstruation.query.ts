import { useQuery } from "@tanstack/react-query";

import {
  getMenstrualRecorded,
  getMenstruationCycles,
} from "@/features/menstruation/api/menstruation.api";

export function useGetMenstruationCyclesQuery({
  date,
  enabled,
}: {
  date: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["menstruation-cycles"],
    queryFn: () => getMenstruationCycles(date),
    enabled: enabled,
    staleTime: Infinity,
  });
}

export function useGetMenstrualRecordedQuery(date: string) {
  return useQuery({
    queryKey: ["menstrual-recorded", date],
    queryFn: () => getMenstrualRecorded(date),
    staleTime: Infinity,
  });
}
