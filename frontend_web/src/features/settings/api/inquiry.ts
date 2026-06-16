import { appApiData } from "@/shared/api/apiClient";
export async function registerInquiry({
  content,
  app_version,
  os_name,
  os_version,
}: {
  content: string;
  app_version: string;
  os_name: string;
  os_version: string;
}) {
  await appApiData({
    endpoint: "/profile/inquiry",
    method: "POST",
    body: {
      content,
      app_version,
      os_name,
      os_version,
    },
  });
}
