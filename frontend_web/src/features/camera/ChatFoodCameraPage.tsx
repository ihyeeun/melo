import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/features/camera/CameraPage.module.css";
import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useChatFoodImageFeedbackMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
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
import { requestNativeCameraCapture, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function ChatFoodCameraPage() {
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const { mutateAsync: uploadFoodImage } = useChatFoodImageFeedbackMutation();
  const navigate = useNavigate();

  const autoTriggeredRef = useRef(false);

  const handleCameraActions = useCallback(async () => {
    if (isProcessing) return;
    setCaptureErrorFeedback(null);
    track(EVENT_NAME.FOOD_SCAN_START, { source: "chat_food_camera" });

    let image: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    // 앱에서 이미지를 받아오는 로직
    try {
      setIsOpeningCamera(true);
      image = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "FOOD",
      });
      setIsOpeningCamera(false);
    } catch (error) {
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.FOOD_SCAN_FAIL, {
          reason: "user_cancelled",
          source: "chat_food_camera",
        });
        return;
      }
      track(EVENT_NAME.FOOD_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "카메라를 실행하지 못했어요"),
        source: "chat_food_camera",
      });
      setPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    //서버에 요청을 보내는 값
    try {
      setPreviewSrc(getCapturedImagePreviewSrc(image)); // 이미지 미리보기 설정
      setIsProcessing(true);
      await uploadFoodImage(image);
      track(EVENT_NAME.FOOD_SCAN_SUCCESS, { source: "chat_food_camera" });
      syncAppTab("chat");

      navigate(PATH.CHAT, {
        replace: true,
      });
    } catch (error) {
      track(EVENT_NAME.FOOD_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "음식 메뉴 분석에 실패했어요."),
        source: "chat_food_camera",
      });
      setPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback("FOOD", error));
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, uploadFoodImage, navigate]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;

    autoTriggeredRef.current = true;
    void handleCameraActions();
  }, [handleCameraActions]);

  return (
    <section className={styles.page}>
      <PageHeader title="음식 촬영" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />

      {isOpeningCamera ? (
        <CameraLoading description="" previewSrc={null} />
      ) : isProcessing ? (
        <CameraLoading description="음식을 분석 중이에요" previewSrc={previewSrc} />
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
