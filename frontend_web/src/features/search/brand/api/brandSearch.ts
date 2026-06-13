import { appApiData } from "@/shared/api/apiClient";
import type { SearchBrandResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  BRAND_SEARCH: "/home/searchBrand",
};

export async function getBrandSearch(brandName: string) {
  const response = await appApiData<SearchBrandResponseDto>({
    endpoint: END_POINT.BRAND_SEARCH,
    method: "POST",
    body: { input: brandName },
  });

  return response;
}
