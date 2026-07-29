import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getMealDetail } from "@/features/meal-record/api/mealDetail";
import {
  menuQueryKeys,
  writeMenuDetailCache,
} from "@/features/meal-record/hooks/queries/menuCache";

export function useMealDetailQuery(menuId: number | null) {
  const isValidMenuId = Number.isInteger(menuId) && (menuId as number) > 0;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: menuQueryKeys.detail(menuId),
    queryFn: async () =>
      writeMenuDetailCache(queryClient, await getMealDetail(menuId as number)),
    enabled: isValidMenuId,
  });
}
