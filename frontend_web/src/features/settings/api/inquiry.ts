import { appApiData } from "@/shared/api/appApi";
export async function registerInquiry(content: string) {
  await appApiData({
    endpoint: "/profile/inquiry",
    method: "POST",
    body: { content },
  });
}
