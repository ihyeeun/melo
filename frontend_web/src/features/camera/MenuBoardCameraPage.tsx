import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/features/camera/CameraPage.module.css";
import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useMenuBoardMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getAnalyticsErrorMessage,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
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
  const { mutateAsync: uploadMenuBoardImage } = useMenuBoardMutation();

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
    track(EVENT_NAME.OCR_SCAN_START, { source: "menu_board_camera" });

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
        track(EVENT_NAME.OCR_SCAN_CANCEL, {
          source: "menu_board_camera",
        });
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
      await uploadMenuBoardImage(capturedImage);
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
  }, [isProcessing, navigateToChatAfterSuccess, returnFromCameraPage, uploadMenuBoardImage]);

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
        // title={captureErrorFeedback?.title ?? ""}
        // description={captureErrorFeedback?.description}
        title={"메뉴판을 인식하기 어려웠어요"}
        description={"선명하게 다시 촬영해 주세요"}
      />
    </section>
  );
}
