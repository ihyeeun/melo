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
import { syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import type { ChatMenuBoardRecommendResponseDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useLocation, useNavigate } from "@/shared/navigation/stackflowNavigation";

type MenuBoardCameraLocationState = {
  autoOpenCamera?: boolean;
};

type MenuBoardToChatLocationState = {
  source: "menu-board-camera";
  menuBoardResponse: ChatMenuBoardRecommendResponseDto;
};

export default function MenuBoardCameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);
  const { mutateAsync: uploadMenuBoardImage } = useMenuBoardMutation();

  const locationState = (location.state ?? {}) as MenuBoardCameraLocationState;
  const shouldAutoOpenCamera = locationState.autoOpenCamera === true;
  const [isAutoOpenPending, setIsAutoOpenPending] = useState(shouldAutoOpenCamera);
  const shouldHideWebCameraPrompt =
    isAutoOpenPending && !isProcessing && captureErrorFeedback === null;

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: PATH.CHAT });
  }, []);

  const handleCameraActions = useCallback(async () => {
    if (isProcessing) return;
    setCaptureErrorFeedback(null);
    track(EVENT_NAME.OCR_SCAN_START, { source: "menu_board_camera" });

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "MENU_BOARD",
      });
      setIsAutoOpenPending(false);
    } catch (error) {
      setIsAutoOpenPending(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.OCR_SCAN_FAIL, {
          reason: "user_cancelled",
          source: "menu_board_camera",
        });
        if (shouldAutoOpenCamera) {
          returnFromCameraPage();
        }
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
      const response = await uploadMenuBoardImage(capturedImage);
      track(EVENT_NAME.OCR_SCAN_SUCCESS, { source: "menu_board_camera" });
      syncAppTab("chat");

      navigate(PATH.CHAT, {
        replace: true,
        state: {
          source: "menu-board-camera",
          menuBoardResponse: response,
        } satisfies MenuBoardToChatLocationState,
      });

      toast.success("메뉴판 분석이 완료되었어요");
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
  }, [isProcessing, navigate, returnFromCameraPage, shouldAutoOpenCamera, uploadMenuBoardImage]);

  useEffect(() => {
    if (!shouldAutoOpenCamera || autoTriggeredRef.current) {
      return;
    }

    autoTriggeredRef.current = true;
    void handleCameraActions();
  }, [handleCameraActions, shouldAutoOpenCamera]);

  return (
    <section className={styles.page}>
      {shouldHideWebCameraPrompt ? null : (
        <PageHeader title="메뉴판 촬영" onBack={returnFromCameraPage} />
      )}

      {isProcessing ? (
        <CameraLoading description="메뉴판을 분석 중이에요." previewSrc={capturedPreviewSrc} />
      ) : shouldHideWebCameraPrompt ? (
        <main className={styles.main} />
      ) : (
        <main className={styles.main}>
          {/* <div className={styles.content}>
            <img src="/icons/camera-icon.svg" alt="카메라 아이콘" className={styles.image} />
            <p className="typo-title1">
              메뉴판 전체가 선명하게
              <br />
              보이도록 촬영해주세요
            </p>
          </div> */}
          <div className={styles.actionButtons}>
            <Button
              variant="filled"
              interaction="normal"
              size="small"
              color="primary"
              onClick={handleCameraActions}
            >
              촬영하기
            </Button>
          </div>
        </main>
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={(open) => {
          if (!open) setCaptureErrorFeedback(null);
        }}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
    </section>
  );
}
