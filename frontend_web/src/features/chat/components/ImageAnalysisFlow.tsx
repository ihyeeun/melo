import { useActivity } from "@stackflow/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { MODE } from "@/features/camera/constants/camera.constant";
import {
  getAnalyticsErrorMessage,
  getCapturedImagePreviewSrc,
} from "@/features/camera/utils/cameraCapture";
import { getChatHistory } from "@/features/chat/api/chat.api";
import { AssistantPendingMessage } from "@/features/chat/components/AssistantPendingMessage";
import { useImageAnalysisMutation } from "@/features/chat/hooks/mutations/useImageAnalysis.mutation";
import { useRegisterChatMealMutation } from "@/features/chat/hooks/mutations/useRegisterMeal.mutation";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import { MealTimeSelectCard } from "@/features/chat/pages/AIChatPage";
import { useClearImage, useGetImage } from "@/features/chat/stores/camera.store";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import { getCurrentDateTime } from "@/features/chat/utils/date.util";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { trackScanMenuSave } from "@/shared/analytics/menuSaveEvent.util";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { captureScreenRequestScope, type ScreenRequestScope } from "@/shared/api/screenRequests";
import type { MealType } from "@/shared/api/types/api.dto";
import { toast } from "@/shared/commons/toast/toast";

interface MealTimeDecision {
  status: "waiting" | "confirmed" | "skipped";
  mealTime?: MealType;
}

export function ImageAnalysisFlow({
  enabled,
  waitForResponse,
  onNutritionAnalyzed,
}: {
  enabled?: boolean;
  waitForResponse: (chatId: number) => Promise<void>;
  onNutritionAnalyzed: (chatId: number) => void;
}) {
  const { id: screenId, isActive } = useActivity();
  const queryClient = useQueryClient();
  const getImage = useGetImage();
  const clearImage = useClearImage();

  const [decision, setDecision] = useState<MealTimeDecision>({
    status: "waiting",
  });
  const [{ dateKey, mealTime: initMealTime }] = useState(getCurrentDateTime);
  const [historyStatus, setHistoryStatus] = useState<"pending" | "success" | "error">("pending");
  const [flowError, setFlowError] = useState<string | null>(null);

  const hasStartedRef = useRef(false);
  const historyRequestedRef = useRef(false);

  const previewSrc = getImage ? getCapturedImagePreviewSrc(getImage.image) : null;
  const mode = getImage?.image.mode;
  const isMealTimeCardVisible = mode === MODE.FOOD && decision.status === "waiting";

  const {
    mutate: analyzeImage,
    data: analysisResult,
    isPending: analyzePending,
    isSuccess: analysisSuccess,
  } = useImageAnalysisMutation({
    onSuccess: () => {
      // 분석 성공
      if (mode === "FOOD") {
        track(EVENT_NAME.FOOD_SCAN_SUCCESS, { source: "chat_food_camera" });
      } else if (mode === "NUTRITION_LABEL") {
        track(EVENT_NAME.LABEL_SCAN_SUCCESS, { source: "chat_nutrition_camera" });
      }
    },
    onError: (error) => {
      // 분석 실패
      if (isRequestAbortError(error)) {
        if (getImage) {
          clearImage(getImage.id);
        }
        return;
      }

      const errorMessage = getAnalyticsErrorMessage(error, "");

      if (mode === "FOOD") {
        track(EVENT_NAME.FOOD_SCAN_FAIL, {
          reason: errorMessage || "음식 메뉴 분석 실패",
          source: "chat_food_camera",
        });
      } else if (mode === "NUTRITION_LABEL") {
        track(EVENT_NAME.LABEL_SCAN_FAIL, {
          reason: errorMessage || "영양성분표 이미지 분석 실패",
          source: "chat_nutrition_camera",
        });
      }

      const retryMessage =
        mode === "FOOD" ? "음식이 잘 보이도록 다시 촬영해 주세요" : "선명하게 다시 촬영해 주세요";

      toast.show({
        type: "error",
        title: errorMessage,
        description: retryMessage,
        timeout: 0,
        dismissible: true,
        position: "bottom",
      });

      if (getImage) {
        clearImage(getImage.id);
      }
    },
  });
  const { mutateAsync: registerChatMeal, isPending: isSavingMeal } = useRegisterChatMealMutation();

  useEffect(() => {
    if (!getImage) return;
    if (!isActive) {
      if (hasStartedRef.current) clearImage(getImage.id);
      return;
    }
    if (!enabled || hasStartedRef.current) return;

    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;

    hasStartedRef.current = true;

    analyzeImage({ image: getImage.image, screen });
  }, [enabled, isActive, screenId, getImage, clearImage, analyzeImage]);

  useEffect(() => {
    if (!isActive || !getImage) return;
    if (!analysisSuccess || !analysisResult) return;
    if (historyRequestedRef.current) return;

    // 음식 사진은 사용자의 결정까지 기다립니다.
    if (mode === MODE.FOOD && decision.status === "waiting") return;

    const shouldSaveMeal = mode === MODE.FOOD && decision.status === "confirmed";

    const selectedMealTime = decision.mealTime;

    if (shouldSaveMeal && selectedMealTime === undefined) return;

    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;

    const captureId = getImage.id;
    const result = analysisResult;

    // 리렌더링으로 같은 작업이 다시 시작되는 것을 막습니다.
    historyRequestedRef.current = true;

    async function finishImageAnalysis() {
      let step: "history" | "meal" = "history";

      try {
        const history = await refreshChatHistory(queryClient, screen);
        screen.assertActive();

        if (mode === MODE.NUTRITION) {
          const chatId = history.chat_list[0]?.id;

          if (chatId === undefined) {
            throw new Error("분석한 대화를 찾지 못했어요.");
          }

          onNutritionAnalyzed(chatId);
        }

        setHistoryStatus("success");

        if (shouldSaveMeal && selectedMealTime !== undefined) {
          const responseChatId = history.chat_list[0]?.id;
          if (responseChatId === undefined) {
            throw new Error("표시할 응답을 찾지 못했어요.");
          }
          await screen.run(() => waitForResponse(responseChatId));
          screen.assertActive();

          step = "meal";

          await registerChatMeal({
            dateKey,
            mealTime: selectedMealTime,
            menus: (result.feedback?.menus ?? []).map((menu) => ({
              id: menu.menu_id,
              quantity: menu.estimated_quantity ?? menu.weight,
              mode: menu.estimated_quantity != null ? "weight" : "unit",
            })),
            image: result.image_url ?? undefined,
            screen,
          });

          trackScanMenuSave({
            menus:
              result.feedback?.menus.map(({ menu_id, menu_name }) => ({ menu_id, menu_name })) ??
              [],
            scanType: "photo",
            source: "chat_tab",
          });
          screen.assertActive();
        }

        // 기록 취소와 영양성분표 분석은 저장 없이 여기까지 옵니다.
        clearImage(captureId);
      } catch (error) {
        if (isRequestAbortError(error) || !screen.isActive()) return;

        if (step === "history") {
          setHistoryStatus("error");
          setFlowError("분석 결과를 대화에 불러오지 못했어요.");
        } else {
          setFlowError("식사 기록 처리를 완료하지 못했어요. 기록을 확인해 주세요.");
        }
      }
    }

    void finishImageAnalysis();
  }, [
    isActive,
    getImage,
    analysisSuccess,
    analysisResult,
    mode,
    decision,
    screenId,
    queryClient,
    dateKey,
    registerChatMeal,
    clearImage,
    waitForResponse,
    onNutritionAnalyzed,
  ]);

  const isHistoryLoading = analysisSuccess && historyStatus === "pending";

  const showPending =
    !isMealTimeCardVisible && !flowError && (analyzePending || isHistoryLoading || isSavingMeal);

  return (
    <div className={styles.conversation}>
      {previewSrc && historyStatus !== "success" && (
        <div className={styles.messageArea} data-owner="user">
          <img src={previewSrc} className={styles.sendImage} alt="촬영한 음식 또는 영양성분표" />
        </div>
      )}

      <div className={styles.messageArea} data-owner="ai">
        {isMealTimeCardVisible && (
          <MealTimeSelectCard
            initMealTime={initMealTime}
            onConfirm={(mealTime) => {
              setDecision({ status: "confirmed", mealTime });
            }}
            onDismiss={() => {
              setDecision({ status: "skipped" });
            }}
          />
        )}

        {showPending && <AssistantPendingMessage />}

        {flowError && (
          <p role="alert" className="body-m-regular text-primary">
            {flowError}
          </p>
        )}
      </div>
    </div>
  );
}

async function refreshChatHistory(queryClient: QueryClient, screen: ScreenRequestScope) {
  screen.assertActive();

  await queryClient.cancelQueries({
    queryKey: queryKeys.chatHistory,
    exact: true,
  });

  return screen.run(() =>
    queryClient.fetchQuery({
      queryKey: queryKeys.chatHistory,
      queryFn: getChatHistory,
      staleTime: 0,
      retry: false,
    }),
  );
}
