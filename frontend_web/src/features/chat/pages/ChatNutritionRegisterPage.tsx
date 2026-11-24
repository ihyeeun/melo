import { useQueryClient } from "@tanstack/react-query";

import { useRegisterMenuByNutritionLabelImageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import { queryKeys as chatQueryKeys } from "@/features/chat/hooks/queries/queryKey";
import { getCurrentDateTime } from "@/features/chat/utils/date.util";
import {
  NutrientRegisterFormPage,
  type NutrientRegisterSubmitPayload,
} from "@/features/nutrient-entry/components/NutrientRegisterFormPage";
import { PATH } from "@/router/path";
import { trackNutritionLabelRegisterFail } from "@/shared/analytics/nutritionLabelEvents";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { NutritionLabelMenuRegisterRequestDto } from "@/shared/api/types/api.request.dto";
import type { NutritionLabelRecognitionResponseDto } from "@/shared/api/types/api.response.dto";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useLocation } from "@/shared/navigation/stackflowNavigation";

const MAX_INPUT_LENGTH = 300;

// screen: DIET-02-004
export default function ChatNutritionRegisterPage() {
  const queryClient = useQueryClient();
  const { state } = useLocation<NutritionLabelRecognitionResponseDto>();
  const { mutateAsync: registerMenu, isPending: isSubmitting } =
    useRegisterMenuByNutritionLabelImageMutation();

  const { dateKey, mealTime } = getCurrentDateTime();

  const handleSubmit = async (form: NutrientRegisterSubmitPayload) => {
    if (isSubmitting) {
      return;
    }

    const body = buildNutritionLabelRegisterBody(form);

    if (!body) {
      trackNutritionLabelRegisterFail("영양성분 정보를 불러오지 못했어요. 다시 시도해주세요.");
      toast.error("영양성분 정보를 불러오지 못했어요. 다시 시도해주세요.");
      return;
    }

    try {
      // 실패 이벤트(label_register_fail)는 뮤테이션에서 보낸다
      await registerMenu({ body });
    } catch (error) {
      if (isRequestAbortError(error)) return;
      toast.error("음식을 등록하지 못했어요", "잠시 후 다시 시도해주세요");
      return;
    }

    try {
      await queryClient.refetchQueries({
        queryKey: chatQueryKeys.chatHistory,
        type: "all",
      });
    } catch (error) {
      if (isRequestAbortError(error)) return;
      // Cache sync is best-effort after the menu registration has already succeeded.
    }

    toast.success("음식을 등록했어요");
    navigateBack({ fallbackTo: PATH.CHAT, skipBackHandler: true });
  };

  return (
    <>
      <NutrientRegisterFormPage
        appendMealQueryToBrandSearchReturn={false}
        backFallbackPath={PATH.CHAT}
        dateKey={dateKey}
        mealType={mealTime}
        initialState={{
          ...(state ?? {}),
          unit: state?.unit === 1 ? 1 : 0,
        }}
        isSubmitPending={isSubmitting}
        onSubmit={handleSubmit}
      />

      {isSubmitting ? <LoadingOverlay label="메뉴를 등록하는 중입니다." /> : null}
    </>
  );
}

function buildNutritionLabelRegisterBody(
  nutrition: NutrientRegisterSubmitPayload,
): NutritionLabelMenuRegisterRequestDto | null {
  if (
    !Number.isFinite(nutrition.unit) ||
    !Number.isFinite(nutrition.weight) ||
    !Number.isFinite(nutrition.calories)
  ) {
    return null;
  }

  return {
    name: nutrition.name.trim().slice(0, MAX_INPUT_LENGTH),
    brand: nutrition.brand.trim().slice(0, MAX_INPUT_LENGTH),
    unit: nutrition.unit as number,
    weight: nutrition.weight as number,
    calories: nutrition.calories as number,
    carbs: nutrition.carbs,
    sugars: nutrition.sugars,
    sugar_alchol: nutrition.sugar_alchol,
    dietary_fiber: nutrition.dietary_fiber,
    protein: nutrition.protein,
    fat: nutrition.fat,
    sat_fat: nutrition.sat_fat,
    trans_fat: nutrition.trans_fat,
    un_sat_fat: nutrition.un_sat_fat,
    sodium: nutrition.sodium,
    caffeine: nutrition.caffeine,
    potassium: nutrition.potassium,
    cholesterol: nutrition.cholesterol,
    alcohol: nutrition.alcohol,
  };
}
