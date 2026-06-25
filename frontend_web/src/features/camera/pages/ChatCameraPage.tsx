import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import {
  useCreateMealFeedbackByFoodImageMutation,
  useGetFeedbackByNutritionLabelImageMutation,
  useRecommendMenusByMenuBoardImageMutation,
} from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import styles from "@/features/camera/styles/CameraPage.module.css";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getAnalyticsErrorMessage,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import { getChatCameraSupportResult } from "@/features/camera/utils/chatCameraSupport";
import {
  getChatHistoryPlaybackBaselineIds,
  setChatHistoryPlaybackBaselineIds,
} from "@/features/chat/utils/chatHistoryPlayback";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import {
  trackNutritionLabelScanCancel,
  trackNutritionLabelScanFail,
  trackNutritionLabelScanStart,
  trackNutritionLabelScanSuccess,
} from "@/shared/analytics/nutritionLabelEvents";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import {
  isPreviousStackActivity,
  navigateBack,
  navigateBackAndPush,
} from "@/shared/navigation/stackflowNavigation";

const CHAT_CAMERA_SOURCE = {
  FOOD: "chat_camera_food",
  NUTRITION_LABEL: "chat_camera_nutrition_label",
  MENU_BOARD: "chat_camera_menu_board",
} as const;

const CHAT_CAMERA_LOADING_DESCRIPTION = {
  FOOD: "음식을 분석 중이에요",
  NUTRITION_LABEL: "영양 성분을 확인하고 있어요",
  MENU_BOARD: "메뉴판을 분석 중이에요",
} as const;

function resolveChatCameraMode(mode: string | null | undefined) {
  if (mode === "NUTRITION_LABEL" || mode === "MENU_BOARD") return mode;
  return "FOOD";
}

type ChatCameraMode = keyof typeof CHAT_CAMERA_LOADING_DESCRIPTION;

function trackScanStart(mode: ChatCameraMode) {
  if (mode === "NUTRITION_LABEL") {
    trackNutritionLabelScanStart({ source: CHAT_CAMERA_SOURCE[mode] });
    return;
  }

  track(mode === "FOOD" ? EVENT_NAME.FOOD_SCAN_START : EVENT_NAME.OCR_SCAN_START, {
    source: CHAT_CAMERA_SOURCE[mode],
  });
}

function trackScanSuccess(mode: ChatCameraMode) {
  if (mode === "NUTRITION_LABEL") {
    trackNutritionLabelScanSuccess({ source: CHAT_CAMERA_SOURCE[mode] });
    return;
  }

  track(mode === "FOOD" ? EVENT_NAME.FOOD_SCAN_SUCCESS : EVENT_NAME.OCR_SCAN_SUCCESS, {
    source: CHAT_CAMERA_SOURCE[mode],
  });
}

function trackScanCancel(mode: ChatCameraMode) {
  if (mode === "NUTRITION_LABEL") {
    trackNutritionLabelScanCancel({ source: CHAT_CAMERA_SOURCE[mode] });
    return;
  }

  track(mode === "FOOD" ? EVENT_NAME.FOOD_SCAN_CANCEL : EVENT_NAME.OCR_SCAN_CANCEL, {
    source: CHAT_CAMERA_SOURCE[mode],
  });
}

function trackScanFail(mode: ChatCameraMode, reason: string) {
  if (mode === "NUTRITION_LABEL") {
    trackNutritionLabelScanFail(reason, { source: CHAT_CAMERA_SOURCE[mode] });
    return;
  }

  track(mode === "FOOD" ? EVENT_NAME.FOOD_SCAN_FAIL : EVENT_NAME.OCR_SCAN_FAIL, {
    reason,
    source: CHAT_CAMERA_SOURCE[mode],
  });
}

export default function ChatCameraPage() {
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState<string>(
    CHAT_CAMERA_LOADING_DESCRIPTION.FOOD,
  );
  const [chatCameraUpdateUrl, setChatCameraUpdateUrl] = useState<string | null>(null);
  const [isChatCameraUpdateModalOpen, setIsChatCameraUpdateModalOpen] = useState(false);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);
  const queryClient = useQueryClient();
  const { mutateAsync: uploadFoodImage } = useCreateMealFeedbackByFoodImageMutation();
  const { mutateAsync: uploadMenuBoardImage } = useRecommendMenusByMenuBoardImageMutation();
  const { mutateAsync: uploadNutritionLabelImage } = useGetFeedbackByNutritionLabelImageMutation();

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: PATH.CHAT });
  }, []);

  const navigateToChatAfterSuccess = useCallback(() => {
    if (isPreviousStackActivity("Chat")) {
      navigateBack({ fallbackTo: PATH.CHAT });
      return;
    }

    navigateBackAndPush({
      fallbackTo: PATH.CHAT,
      to: PATH.CHAT,
    });
  }, []);

  const handleCameraActions = useCallback(async () => {
    if (isProcessing) return;
    setCaptureErrorFeedback(null);

    let image: CapturedImage;
    try {
      const supportResult = await getChatCameraSupportResult();

      if (!supportResult.isSupported) {
        setIsOpeningCamera(false);
        setChatCameraUpdateUrl(supportResult.updateUrl);
        setIsChatCameraUpdateModalOpen(true);
        return;
      }

      setIsOpeningCamera(true);
      image = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "FOOD",
        selectableModes: ["FOOD", "NUTRITION_LABEL", "MENU_BOARD"],
      });
      setIsOpeningCamera(false);
    } catch (error) {
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        trackScanCancel("FOOD");
        returnFromCameraPage();
        return;
      }

      trackScanFail("FOOD", getAnalyticsErrorMessage(error, "카메라를 실행하지 못했어요"));
      setPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    const selectedMode = resolveChatCameraMode(image.mode);

    try {
      setPreviewSrc(getCapturedImagePreviewSrc(image));
      setLoadingDescription(CHAT_CAMERA_LOADING_DESCRIPTION[selectedMode]);
      setIsProcessing(true);
      trackScanStart(selectedMode);

      const playbackBaselineChatIds = await getChatHistoryPlaybackBaselineIds(queryClient);

      if (selectedMode === "FOOD") {
        await uploadFoodImage(image);
      } else if (selectedMode === "NUTRITION_LABEL") {
        await uploadNutritionLabelImage(image);
      } else {
        await uploadMenuBoardImage(image);
      }

      if (playbackBaselineChatIds !== null) {
        setChatHistoryPlaybackBaselineIds(queryClient, playbackBaselineChatIds);
      }

      navigateToChatAfterSuccess();

      trackScanSuccess(selectedMode);
    } catch (error) {
      trackScanFail(selectedMode, getAnalyticsErrorMessage(error, "이미지 분석에 실패했어요."));
      setPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback(selectedMode, error));
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    navigateToChatAfterSuccess,
    queryClient,
    returnFromCameraPage,
    uploadFoodImage,
    uploadMenuBoardImage,
    uploadNutritionLabelImage,
  ]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;

    autoTriggeredRef.current = true;
    void handleCameraActions();
  }, [handleCameraActions]);

  const handleCaptureErrorModalOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;

      setCaptureErrorFeedback(null);
      window.setTimeout(() => {
        void handleCameraActions();
      }, 0);
    },
    [handleCameraActions],
  );

  return (
    <section className={styles.page}>
      <PageHeader title="사진 촬영" onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isProcessing ? (
        <CameraLoading description={loadingDescription} previewSrc={previewSrc} />
      ) : (
        <main className={styles.main} />
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
      <ChatCameraUpdateRequiredModal
        open={isChatCameraUpdateModalOpen}
        updateUrl={chatCameraUpdateUrl}
        onOpenChange={(open) => {
          setIsChatCameraUpdateModalOpen(open);

          if (!open) {
            returnFromCameraPage();
          }
        }}
      />
    </section>
  );
}

type CapturedImage = Awaited<ReturnType<typeof requestNativeCameraCapture>>;
