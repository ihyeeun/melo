import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import { menuQueryKeys, writeMenuListCache } from "@/features/meal-record/hooks/queries/menuCache";
import {
  getFrequentlyRecordedMenus,
  getRegisteredMenus,
} from "@/features/search/menu-record/api/mealSearch.api";

type PersonalMenusQueryOptions = {
  enabled?: boolean;
};

type RegisteredMenusQueryOptions = PersonalMenusQueryOptions & {
  input: string;
  limit: number;
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

export function useGetRegisteredMenus({
  enabled = true,
  input,
  limit,
}: RegisteredMenusQueryOptions) {
  const queryClient = useQueryClient();
  const normalizedInput = input.trim();

  return useInfiniteQuery({
    queryKey: menuQueryKeys.registeredList(normalizedInput, limit),
    queryFn: async ({ pageParam }) => {
      const response = await getRegisteredMenus({
        input: normalizedInput,
        limit,
        cursor: pageParam,
      });

      return writeMenuListCache(queryClient, response);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
    staleTime: Infinity,
  });
}
