import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getProfile } from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { identifyAnalyticsUser } from "@/shared/analytics/analytics";
import { useSetTargets } from "@/shared/stores/targetNutrient.store";

type UseGetProfileQueryOptions = {
  enabled?: boolean;
};

function toTargetRatioTuple(targetRatio: number[]): [carbs: number, protein: number, fat: number] {
  return [targetRatio[0] ?? 0, targetRatio[1] ?? 0, targetRatio[2] ?? 0];
}

export function useGetProfileQuery(options?: UseGetProfileQueryOptions) {
  const setTargets = useSetTargets();
  const isEnabled = options?.enabled;
  const shouldSyncProfileSideEffects = isEnabled !== false;
  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
    staleTime: Infinity,
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!shouldSyncProfileSideEffects || !query.data) return;
    identifyAnalyticsUser(query.data);
    setTargets({
      target_calories: query.data.target_calories,
      target_ratio: toTargetRatioTuple(query.data.target_ratio),
    });
  }, [query.data, setTargets, shouldSyncProfileSideEffects]);

  return query;
}
