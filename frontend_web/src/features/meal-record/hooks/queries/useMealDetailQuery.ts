import { useQuery } from "@tanstack/react-query";

import { getMealDetail } from "@/features/meal-record/api/mealDetail";

export function useMealDetailQuery(menuId: number | null) {
  const isValidMenuId = Number.isInteger(menuId) && (menuId as number) > 0;

  return useQuery({
    queryKey: ["meal-detail", menuId],
    queryFn: () => getMealDetail(menuId as number),
    enabled: isValidMenuId,
  });
}
