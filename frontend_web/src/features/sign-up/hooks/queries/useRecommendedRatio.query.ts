import { useQuery } from "@tanstack/react-query";

import { postRecommendNutrient } from "@/features/profile/api/recommend.api";
import { roundRecommendedRatio } from "@/features/profile/goalEdit.model";
import { signUpKeys } from "@/features/sign-up/constants/signUp.querykey";
import type { SignUpForm, SignUpType } from "@/features/sign-up/types/signUp.type";

export function useRecommendedRatioQuery(form: SignUpForm) {
  const { target_calories, weight, goal, target_weight } = form;
  const body = { target_calories, weight, goal, target_weight };

  return useQuery({
    queryKey: signUpKeys.recommendation.ratio(body),
    queryFn: () => postRecommendNutrient(body),
    select: ({ carbs, protein, fat }): SignUpType["target_ratio"] =>
      roundRecommendedRatio([carbs, protein, fat]),
    // 같은 입력이면 추천값도 같으므로 다시 요청하지 않는다
    staleTime: Infinity,
  });
}
