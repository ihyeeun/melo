import { useQuery } from "@tanstack/react-query";

import { getRecentMenus } from "@/features/search/menu-record/api/mealSearch.api";

export function useGetRecentMenusQuery(enabled?: boolean) {
  return useQuery({
    queryKey: ["recent_record_menus"] as const,
    queryFn: () => getRecentMenus(),
    staleTime: 0,
    enabled,
  });
}
