import { useQuery } from "@tanstack/react-query";

import {
  canUseNativeStepCount,
  readNativeStepCount,
  readNativeStepCountRecordsRange,
} from "@/features/health/services/nativeStepCount.service";

export function useNativeStepCountRecordsQuery(
  payload: { endDate: string; startDate: string },
  options?: { enabled?: boolean },
) {
  const enabled = canUseNativeStepCount(payload.startDate, payload.endDate, options?.enabled ?? true);

  return useQuery({
    queryKey: ["native-step-count-records", payload.startDate, payload.endDate],
    queryFn: () => readNativeStepCountRecordsRange(payload.startDate, payload.endDate),
    enabled,
    retry: false,
    refetchOnMount: "always",
  });
}

export function useNativeStepCountQuery(date: string, options?: { enabled?: boolean }) {
  const enabled = canUseNativeStepCount(date, date, options?.enabled ?? true);

  return useQuery({
    queryKey: ["native-step-count", date],
    queryFn: () => readNativeStepCount(date),
    enabled,
    retry: false,
    refetchOnMount: "always",
  });
}
