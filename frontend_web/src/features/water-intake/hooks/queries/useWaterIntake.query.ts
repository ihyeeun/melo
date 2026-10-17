import { useQuery } from "@tanstack/react-query";

import { getWaterIntake } from "@/features/water-intake/apis/water.api";
import { waterIntakeKeys } from "@/features/water-intake/constants/waterIntake.querykey";

export function useGetWaterIntakeQuery(date: string) {
  return useQuery({
    queryKey: waterIntakeKeys.record.date(date),
    queryFn: () => getWaterIntake(date),
    staleTime: Infinity,
  });
}
