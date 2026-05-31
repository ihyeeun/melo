import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getProfile } from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { identifyUserProperties } from "@/shared/analytics/analytics";

type UseGetProfileQueryOptions = {
  enabled?: boolean;
};

export function useGetProfileQuery(options?: UseGetProfileQueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
    staleTime: Infinity,
    enabled: options?.enabled,
  });

  useEffect(() => {
    if (!query.data?.nickname) return;
    identifyUserProperties(query.data);
  }, [query.data]);

  return query;
}
