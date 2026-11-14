import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import type { GoalEditDraft } from "@/features/profile/goalEdit.model";

const END_POINT = {
  RECOMMEND_CALORIES: "/userAuth/defaltTargetCalories",
  RECOMMEND_NUTRIENT: "/userAuth/defaltRatio",
};

export function fetchRecommendtargetCalories(payload: GoalEditDraft) {
  return webAuthApiData<number>({
    endpoint: END_POINT.RECOMMEND_CALORIES,
    method: "POST",
    body: payload,
  });
}

type NutrientResponse = {
  carbs: number;
  protein: number;
  fat: number;
};
export function postRecommendNutrient(payload: GoalEditDraft) {
  return webAuthApiData<NutrientResponse>({
    endpoint: END_POINT.RECOMMEND_NUTRIENT,
    method: "POST",
    body: payload,
  });
}
