import { appApiData } from "@/shared/api/apiClient";
import type { UpsertFolderRequestDto } from "@/shared/api/types/api.request.dto";
import type { FolderDetailResponseDto } from "@/shared/api/types/api.response.dto";

export async function upsertFolder(body: UpsertFolderRequestDto) {
  const response = await appApiData<number>({
    endpoint: "/home/folder",
    method: "POST",
    body,
  });

  return response;
}

export async function getFolderItems({ folder_id }: { folder_id: number }) {
  const response = await appApiData<FolderDetailResponseDto>({
    endpoint: "/home/folder/detail",
    method: "POST",
    body: { folder_id },
  });

  return response;
}
