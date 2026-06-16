import { appApiData } from "@/shared/api/apiClient";
import type { SearchMenuRequestDto } from "@/shared/api/types/api.dto";
import type { SearchResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  SEARCH_MENUS: "/home/search",
};

export async function postMealSearch({ input, limit, cursor }: SearchMenuRequestDto) {
  const body: SearchMenuRequestDto = {
    input,
    limit,
    ...(cursor === undefined || cursor === null ? {} : { cursor }),
  };

  const response = await appApiData<SearchResponseDto>({
    endpoint: END_POINT.SEARCH_MENUS,
    method: "POST",
    body,
  });

  return response;
}
