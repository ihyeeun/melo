import { appApiData } from "@/shared/api/apiClient";
import type { UpsertFolderRequestDto } from "@/shared/api/types/api.request.dto";

export async function createFolder(body: UpsertFolderRequestDto) {
  const response = await appApiData<number>({
    endpoint: "/home/folder",
    method: "POST",
    body,
  });

  return response;
}
