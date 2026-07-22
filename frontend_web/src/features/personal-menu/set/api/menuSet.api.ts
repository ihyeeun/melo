import { appApiData } from "@/shared/api/apiClient";
import type { UpsertMenuSetRequestDto } from "@/shared/api/types/api.request.dto";
import type {
  MenuSetDetailResponseDto,
  MenuSetIdResponseDto,
  MenuSetListResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function getMenuSetList({ limit, cursor }: { limit: number; cursor?: number }) {
  const response = await appApiData<MenuSetListResponseDto>({
    endpoint: "/home/sets",
    method: "POST",
    body: {
      limit,
      cursor,
    },
  });

  return response;
}

export async function getMenuSetDetail({ set_id }: { set_id: number }) {
  const response = await appApiData<MenuSetDetailResponseDto>({
    endpoint: "/home/set/detail",
    method: "POST",
    body: {
      set_id,
    },
  });

  return response;
}

export async function upsertMenuSet(body: UpsertMenuSetRequestDto) {
  const response = await appApiData<MenuSetIdResponseDto>({
    endpoint: "/home/set",
    method: "POST",
    body,
  });

  return response;
}
