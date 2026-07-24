import { useQuery, useQueryClient } from "@tanstack/react-query";

import { writeMenuSimpleCache } from "@/features/meal-record/hooks/queries/menuCache";
import { getMenuSetDetail } from "@/features/personal-menu/set/api/menuSet.api";
import { menuSetQueryKeys } from "@/features/personal-menu/set/hooks/queries/menuSet.queryKey";

type UseMenuSetDetailQueryOptions = {
  enabled?: boolean;
};

export function useMenuSetDetailQuery(
  setId: number,
  { enabled = true }: UseMenuSetDetailQueryOptions = {},
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: menuSetQueryKeys.detail(setId),
    queryFn: async () => {
      const response = await getMenuSetDetail({ set_id: setId });

      response.menu_list.forEach((menu) => writeMenuSimpleCache(queryClient, menu));

      return response;
    },
    enabled: enabled && Number.isInteger(setId) && setId > 0,
    staleTime: Infinity,
  });
}
