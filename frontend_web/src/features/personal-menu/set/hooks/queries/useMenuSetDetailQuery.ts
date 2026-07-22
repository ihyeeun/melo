import { useQuery } from "@tanstack/react-query";

import { getMenuSetDetail } from "@/features/personal-menu/set/api/menuSet.api";
import { menuSetQueryKeys } from "@/features/personal-menu/set/hooks/queries/menuSet.queryKey";

type UseMenuSetDetailQueryOptions = {
  enabled?: boolean;
};

export function useMenuSetDetailQuery(
  setId: number,
  { enabled = true }: UseMenuSetDetailQueryOptions = {},
) {
  return useQuery({
    queryKey: menuSetQueryKeys.detail(setId),
    queryFn: () => getMenuSetDetail({ set_id: setId }),
    enabled: enabled && Number.isInteger(setId) && setId > 0,
  });
}
