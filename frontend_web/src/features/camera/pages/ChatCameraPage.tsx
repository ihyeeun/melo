import { useActivity } from "@stackflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { MODE } from "@/features/camera/constants/camera.constant";
import styles from "@/features/camera/styles/CameraPage.module.css";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getCameraCaptureErrorFeedback,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import { getChatCameraSupportResult } from "@/features/camera/utils/chatCameraSupport";
import { useSetImage } from "@/features/chat/stores/camera.store";
import { PATH } from "@/router/path";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import {
  isPreviousStackActivity,
  navigateBack,
  useNavigate,
} from "@/shared/navigation/stackflowNavigation";

function resolveChatCameraMode(mode: string | null | undefined) {
  if (mode === MODE.NUTRITION) return mode;
  return MODE.FOOD;
}

interface CameraUpdateNotice {
  updateUrl: string | null;
}

export default function ChatCameraPage() {
  const navigate = useNavigate();
  const setImage = useSetImage();

  const [updateNotice, setUpdateNotice] = useState<CameraUpdateNotice | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const { id: screenId, isActive: isScreenActive } = useActivity();
  const hasAutoOpenedCameraRef = useRef(false);

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: PATH.CHAT });
  }, []);

  const moveToChat = useCallback(() => {
    if (isPreviousStackActivity("Chat")) {
      navigateBack({ fallbackTo: PATH.AI_CHAT });
      return;
    }

    navigate(PATH.AI_CHAT, {
      replace: true,
    });
  }, [navigate]);

  const handleCameraActions = useCallback(async () => {
    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;
    hasAutoOpenedCameraRef.current = true;
    setCaptureErrorFeedback(null);

    let image: CapturedImage;
    try {
      const supportResult = await getChatCameraSupportResult();
      screen.assertActive();

      if (!supportResult.isSupported) {
        setUpdateNotice({
          updateUrl: supportResult.updateUrl,
        });
        return;
      }

      image = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: MODE.FOOD,
        selectableModes: [MODE.FOOD, MODE.NUTRITION],
      });
      screen.assertActive();
    } catch (error) {
      if (!screen.isActive()) return;
      if (isCameraCaptureCancelled(error)) {
        returnFromCameraPage();
        return;
      }

      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    const selectedMode = resolveChatCameraMode(image.mode);

    try {
      setImage(image);
      moveToChat();
    } catch (error) {
      if (!screen.isActive()) return;
      setCaptureErrorFeedback(getRecognitionErrorFeedback(selectedMode, error));
    }
  }, [returnFromCameraPage, screenId, setImage, moveToChat]);

  useEffect(() => {
    if (!isScreenActive) {
      hasAutoOpenedCameraRef.current = false;
      return;
    }
    if (hasAutoOpenedCameraRef.current) return;

    void handleCameraActions();
  }, [handleCameraActions, isScreenActive]);

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
      <PageHeader title={"사진 촬영"} onBack={returnFromCameraPage} />

      <main className={styles.main} />

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
      <ChatCameraUpdateRequiredModal
        open={updateNotice !== null}
        updateUrl={updateNotice?.updateUrl ?? null}
        onOpenChange={(open) => {
          if (open) return;

          setUpdateNotice(null);
          returnFromCameraPage();
        }}
      />
    </section>
  );
}

type CapturedImage = Awaited<ReturnType<typeof requestNativeCameraCapture>>;
