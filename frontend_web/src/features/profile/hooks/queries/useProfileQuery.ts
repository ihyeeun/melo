import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getProfile } from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { identifyNickname } from "@/shared/analytics/analytics";

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
    identifyNickname(query.data?.nickname);
  }, [query.data?.nickname]);

  return query;
}
