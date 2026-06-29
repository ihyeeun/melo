import { useQuery } from "@tanstack/react-query";

import {
  getFrequentlyRecordedMenus,
  getRegisteredMenus,
} from "@/features/search/menu-record/api/mealSearch.api";

type PersonalMenusQueryOptions = {
  enabled?: boolean;
};

export function useGetFrequentlyRecordedMenus({
  enabled = true,
}: PersonalMenusQueryOptions = {}) {
  return useQuery({
    queryKey: ["frequently-recorded-menus"],
    queryFn: getFrequentlyRecordedMenus,
    enabled,
  });
}

export function useGetRegisteredMenus({ enabled = true }: PersonalMenusQueryOptions = {}) {
  return useQuery({
    queryKey: ["registered-menus"],
    queryFn: getRegisteredMenus,
    enabled,
  });
}
