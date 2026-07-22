import { useQuery, useQueryClient } from "@tanstack/react-query";

import { menuQueryKeys, writeMenuListCache } from "@/features/meal-record/hooks/queries/menuCache";
import {
  getFrequentlyRecordedMenus,
  getRegisteredMenus,
} from "@/features/search/menu-record/api/mealSearch.api";

type PersonalMenusQueryOptions = {
  enabled?: boolean;
};

export function useGetFrequentlyRecordedMenus({ enabled = true }: PersonalMenusQueryOptions = {}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: menuQueryKeys.frequentlyRecorded(),
    queryFn: async () => writeMenuListCache(queryClient, await getFrequentlyRecordedMenus()),
    enabled,
    staleTime: Infinity,
  });
}

export function useGetRegisteredMenus({ enabled = true }: PersonalMenusQueryOptions = {}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: menuQueryKeys.registered(),
    queryFn: async () => writeMenuListCache(queryClient, await getRegisteredMenus()),
    enabled,
    staleTime: Infinity,
  });
}
