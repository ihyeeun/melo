import { useQueryClient } from "@tanstack/react-query";

import { getAnalyticsErrorMessage } from "@/features/camera/utils/cameraCapture";
import { useRegisterMenuByNutritionLabelImageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import { queryKeys as chatQueryKeys } from "@/features/chat/hooks/queries/queryKey";
import {
  getChatHistoryPlaybackBaselineIds,
  setChatHistoryPlaybackBaselineIds,
} from "@/features/chat/utils/chatHistoryPlayback";
import { getMealTypeFromCurrentTime } from "@/features/chat/utils/chatMeal";
import { getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import {
  NutrientRegisterFormPage,
  type NutrientRegisterFormState,
  type NutrientRegisterSubmitPayload,
} from "@/features/nutrient-entry/components/NutrientRegisterFormPage";
import { PATH } from "@/router/path";
import {
  trackNutritionLabelRegisterFail,
  trackNutritionLabelRegisterSuccess,
} from "@/shared/analytics/nutritionLabelEvents";
import type { NutritionLabelMenuRegisterRequestDto } from "@/shared/api/types/api.request.dto";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

type ChatNutritionRegisterState = Partial<NutritionLabelMenuRegisterRequestDto> & {
  chatId?: number;
} & NutrientRegisterFormState;

const MAX_INPUT_LENGTH = 300;

function getChatNutritionRegisterPath(chatId: number | null) {
  if (chatId === null) {
    return PATH.CHAT_NUTRITION_REGISTER;
  }

  const params = new URLSearchParams({
    chatId: String(chatId),
  });

  return `${PATH.CHAT_NUTRITION_REGISTER}?${params.toString()}`;
}

export default function ChatNutritionRegisterPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as ChatNutritionRegisterState;
  const chatId = getSafeChatId(searchParams.get("chatId")) ?? locationState.chatId ?? null;
  const dateKey = getTodayFormatDateKey();
  const mealType = getMealTypeFromCurrentTime(new Date());
  const { mutateAsync: registerMenu, isPending: isSubmitting } =
    useRegisterMenuByNutritionLabelImageMutation();

  const handleSubmit = async (form: NutrientRegisterSubmitPayload) => {
    if (isSubmitting) {
      return;
    }

    const body = buildNutritionLabelRegisterBody(form);

    if (!body) {
      trackNutritionLabelRegisterFail("영양성분 정보를 불러오지 못했어요. 다시 시도해주세요.");
      toast.warning("영양성분 정보를 불러오지 못했어요. 다시 시도해주세요.");
      return;
    }

    let hasRegisterSucceeded = false;

    try {
      const playbackBaselineChatIds = await getChatHistoryPlaybackBaselineIds(queryClient);
      await registerMenu({ body });
      hasRegisterSucceeded = true;
      trackNutritionLabelRegisterSuccess();

      await queryClient.refetchQueries({
        queryKey: chatQueryKeys.chatHistory,
        type: "all",
      });

      if (playbackBaselineChatIds !== null) {
        setChatHistoryPlaybackBaselineIds(queryClient, playbackBaselineChatIds);
      }

      toast.success("메뉴가 등록되었어요.");
      navigateBack({ fallbackTo: PATH.CHAT });
    } catch (error) {
      if (!hasRegisterSucceeded) {
        trackNutritionLabelRegisterFail(
          getAnalyticsErrorMessage(error, "등록에 실패했어요. 잠시 후 다시 시도해주세요."),
        );
      }
      toast.warning("등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <>
      <NutrientRegisterFormPage
        appendMealQueryToBrandSearchReturn={false}
        backFallbackPath={PATH.CHAT}
        brandSearchReturnPath={getChatNutritionRegisterPath(chatId)}
        dateKey={dateKey}
        initialState={{
          ...locationState,
          chatId: chatId ?? undefined,
        }}
        isSubmitPending={isSubmitting}
        mealType={mealType}
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
