import { appApiData } from "@/shared/api/apiClient";
import type { MenuResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  MEAL_DETAIL: "/home/menuDetail",
  MEAL_DELETE: "/home/deleteMenu",
};

export async function getMealDetail(menuId: number) {
  const response = await appApiData<MenuResponseDto>({
    endpoint: END_POINT.MEAL_DETAIL,
    method: "POST",
    body: { id: menuId },
  });

  return response;
}

export async function deleteMeal(menuId: number) {
  const response = await appApiData<null>({
    endpoint: END_POINT.MEAL_DELETE,
    method: "POST",
    body: { id: menuId },
  });

  return response;
}
