import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useRecommendMenusByMenuBoardImageMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
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
import {
  getChatHistoryPlaybackBaselineIds,
  setChatHistoryPlaybackBaselineIds,
} from "@/features/chat/utils/chatHistoryPlayback";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import {
  isPreviousStackActivity,
  navigateBack,
  navigateBackAndPush,
} from "@/shared/navigation/stackflowNavigation";

export default function MenuBoardCameraPage() {
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);
  const queryClient = useQueryClient();
  const { mutateAsync: uploadMenuBoardImage } = useRecommendMenusByMenuBoardImageMutation();

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

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      setIsOpeningCamera(true);
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "MENU_BOARD",
      });
      setIsOpeningCamera(false);
    } catch (error) {
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.CAMERA_CANCEL);
        returnFromCameraPage();
        return;
      }
      track(EVENT_NAME.OCR_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "카메라를 실행하지 못했어요"),
        source: "menu_board_camera",
      });
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    try {
      setCapturedPreviewSrc(getCapturedImagePreviewSrc(capturedImage));
      setIsProcessing(true);
      track(EVENT_NAME.OCR_SCAN_START, { source: "menu_board_camera" });
      const playbackBaselineChatIds = await getChatHistoryPlaybackBaselineIds(queryClient);
      await uploadMenuBoardImage(capturedImage);
      if (playbackBaselineChatIds !== null) {
        setChatHistoryPlaybackBaselineIds(queryClient, playbackBaselineChatIds);
      }
      track(EVENT_NAME.OCR_SCAN_SUCCESS, { source: "menu_board_camera" });

      navigateToChatAfterSuccess();
    } catch (error) {
      track(EVENT_NAME.OCR_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "메뉴판 분석에 실패했어요."),
        source: "menu_board_camera",
      });
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback("MENU_BOARD", error));
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    navigateToChatAfterSuccess,
    queryClient,
    returnFromCameraPage,
    uploadMenuBoardImage,
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
      <PageHeader title="메뉴판 촬영" onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isProcessing ? (
        <CameraLoading description="메뉴판을 분석 중이에요" previewSrc={capturedPreviewSrc} />
      ) : (
        <main className={styles.main} />
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
    </section>
  );
}
