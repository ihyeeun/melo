import { appApiData } from "@/shared/api/apiClient";
import type { SearchMenuRequestDto } from "@/shared/api/types/api.dto";
import type {
  FolderListResponseDto,
  MenuListResponseDto,
  SearchResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function postMealSearch({ input, limit, cursor }: SearchMenuRequestDto) {
  const body: SearchMenuRequestDto = {
    input,
    limit,
    ...(cursor === undefined || cursor === null ? {} : { cursor }),
  };

  const response = await appApiData<SearchResponseDto>({
    endpoint: "/home/search",
    method: "POST",
    body,
  });

  return response;
}

export async function getFrequentlyRecordedMenus() {
  const response = await appApiData<MenuListResponseDto>({
    endpoint: "/home/frequentlyRecordedMenus",
    method: "POST",
  });

  return response;
}

export async function getRegisteredMenus() {
  const response = await appApiData<MenuListResponseDto>({
    endpoint: "/home/registeredMenus",
    method: "POST",
  });

  return response;
}

export async function getFolders({ limit, cursor }: { limit: number; cursor?: number | null }) {
  const body = { limit, cursor };
  const response = await appApiData<FolderListResponseDto>({
    endpoint: "/home/folders",
    method: "POST",
    body,
  });

  return response;
}
